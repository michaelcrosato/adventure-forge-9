import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import { createServer as createHttpServer, type Server } from "node:http";
import { createPlayerServer, handleVercelRequest, type PlayerServer } from "../src/player/server.js";

const openServers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          if (!server.listening) {
            resolve();
            return;
          }
          server.close(() => resolve());
        }),
    ),
  );
});

async function listen(server: Server): Promise<{ server: Server; url: string }> {
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function runningServer(): Promise<{ server: PlayerServer; url: string }> {
  const server = createPlayerServer();
  return listen(server) as Promise<{ server: PlayerServer; url: string }>;
}

async function runningVercelServer(): Promise<{ server: Server; url: string }> {
  return listen(createHttpServer((request, response) => {
    // Simulate Vercel's already-consumed Node request body without changing
    // the handler's production path or adding a framework dependency.
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      Object.defineProperty(request, "body", {
        configurable: true,
        value: raw.length === 0 ? undefined : JSON.parse(raw),
      });
      void handleVercelRequest(request, response);
    });
  }));
}

async function stop(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

async function request(url: string, path: string, init: RequestInit = {}): Promise<{ status: number; body: any; raw: string }> {
  const response = await fetch(url + path, init);
  const raw = await response.text();
  let body: any = undefined;
  try {
    body = JSON.parse(raw);
  } catch {
    body = undefined;
  }
  return { status: response.status, body, raw };
}

function json(value: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) };
}

test("server starts, observes, chooses, and surfaces stale revisions", async () => {
  const { url } = await runningServer();
  const created = await request(url, "/api/start", json({ seed: 9 }));
  assert.equal(created.status, 201);
  assert.equal(typeof created.body.sessionId, "string");
  assert.equal(typeof created.body.checkpoint, "string");
  assert.ok(created.body.observation);

  const allowed = ["revision", "sceneId", "title", "text", "facts", "journal", "resources", "choices", "status", "receipt"];
  assert.deepEqual(Object.keys(created.body.observation).sort(), allowed.filter((key) => key in created.body.observation).sort());
  assert.equal("state" in created.body, false);
  assert.equal("seed" in created.body.observation, false);

  const observed = await request(
    url,
    `/api/observe?sessionId=${encodeURIComponent(created.body.sessionId)}`,
    { method: "GET" },
  );
  assert.equal(observed.status, 200);
  assert.deepEqual(observed.body.observation, created.body.observation);
  assert.equal(observed.body.checkpoint, created.body.checkpoint);

  const firstChoice = created.body.observation.choices[0];
  assert.ok(firstChoice, "the opening scene should offer a legal choice");
  const chosen = await request(
    url,
    "/api/choose",
    json({ sessionId: created.body.sessionId, id: firstChoice.id, expectedRevision: created.body.observation.revision }),
  );
  assert.equal(chosen.status, 200);
  assert.ok(chosen.body.observation.revision > created.body.observation.revision);

  const stale = await request(
    url,
    "/api/choose",
    json({ sessionId: created.body.sessionId, id: firstChoice.id, expectedRevision: created.body.observation.revision }),
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, "stale_revision");
  assert.equal(stale.body.observation.revision, chosen.body.observation.revision);
  assert.equal(typeof stale.body.checkpoint, "string");

  const saved = await request(url, '/api/save', json({ sessionId: created.body.sessionId }));
  assert.equal(saved.status, 200);
  assert.equal(saved.body.checkpoint, saved.body.serialized);
  const loaded = await request(url, '/api/restore', json({ serialized: saved.body.serialized }));
  assert.equal(loaded.status, 201);
  assert.notEqual(loaded.body.sessionId, created.body.sessionId);
  assert.equal(typeof loaded.body.checkpoint, "string");
  assert.deepEqual(loaded.body.observation, chosen.body.observation);
  assert.equal(loaded.body.observation.journal.length, 1);

  const closed = await request(url, '/api/end', json({ sessionId: loaded.body.sessionId, expectedRevision: loaded.body.observation.revision }));
  assert.equal(closed.status, 200);
  assert.equal(closed.body.observation.status, 'departed');
  const original = await request(url, '/api/observe?sessionId=' + encodeURIComponent(created.body.sessionId));
  assert.deepEqual(original.body.observation, chosen.body.observation, 'restored session must evolve independently');
});

test("a checkpoint resumes a missing session with its original id and rejects tampering", async () => {
  const first = await runningServer();
  const started = await request(first.url, "/api/start", json({ seed: 19 }));
  assert.equal(started.status, 201);
  const sessionId = started.body.sessionId;
  const checkpoint = started.body.checkpoint;
  const initialObservation = started.body.observation;
  const firstChoice = initialObservation.choices[0];
  assert.ok(firstChoice);
  await stop(first.server);

  const second = await runningServer();
  const resumed = await request(second.url, "/api/observe", json({ sessionId, checkpoint }));
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.sessionId, sessionId);
  assert.deepEqual(resumed.body.observation, initialObservation);
  assert.equal(resumed.body.checkpoint, checkpoint);

  // The browser sends null when it has no checkpoint; existing sessions keep
  // the normal in-memory behavior for that backwards-compatible payload.
  const legacyObserve = await request(second.url, "/api/observe", json({ sessionId, checkpoint: null }));
  assert.equal(legacyObserve.status, 200);
  assert.deepEqual(legacyObserve.body.observation, initialObservation);

  const chosen = await request(
    second.url,
    "/api/choose",
    json({ sessionId, checkpoint: resumed.body.checkpoint, id: firstChoice.id, expectedRevision: initialObservation.revision }),
  );
  assert.equal(chosen.status, 200);
  const stale = await request(
    second.url,
    "/api/choose",
    json({ sessionId, checkpoint: chosen.body.checkpoint, id: firstChoice.id, expectedRevision: initialObservation.revision }),
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, "stale_revision");
  assert.deepEqual(stale.body.observation, chosen.body.observation);
  assert.equal(stale.body.checkpoint, chosen.body.checkpoint);

  const tamperedEnvelope = JSON.parse(chosen.body.checkpoint) as { payload: { revision: number }; hash: string };
  tamperedEnvelope.payload.revision += 1;
  const third = await runningServer();
  const tampered = await request(
    third.url,
    "/api/observe",
    json({ sessionId, checkpoint: JSON.stringify(tamperedEnvelope) }),
  );
  assert.equal(tampered.status, 400);
  assert.equal(tampered.body.error.code, "invalid_save");
  assert.equal(third.server.sessionCount(), 0);
});

test("the stateless Vercel handler restores pre-parsed checkpoints on every request", async () => {
  const { url } = await runningVercelServer();
  const started = await request(url, "/api/start", json({ seed: 23 }));
  assert.equal(started.status, 201);
  const sessionId = started.body.sessionId;
  const checkpoint = started.body.checkpoint;
  const observation = started.body.observation;
  const firstChoice = observation.choices[0];
  assert.ok(firstChoice);

  const resumed = await request(url, "/api/observe", json({ sessionId, checkpoint }));
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.sessionId, sessionId);
  assert.deepEqual(resumed.body.observation, observation);

  const chosen = await request(
    url,
    "/api/choose",
    json({ sessionId, checkpoint, id: firstChoice.id, expectedRevision: observation.revision }),
  );
  assert.equal(chosen.status, 200);
  assert.ok(chosen.body.observation.revision > observation.revision);

  const saved = await request(url, "/api/save", json({ sessionId, checkpoint: chosen.body.checkpoint }));
  assert.equal(saved.status, 200);
  assert.equal(saved.body.sessionId, sessionId);
  assert.equal(saved.body.serialized, chosen.body.checkpoint);
  assert.equal(saved.body.checkpoint, saved.body.serialized);

  const stale = await request(
    url,
    "/api/choose",
    json({ sessionId, checkpoint: chosen.body.checkpoint, id: firstChoice.id, expectedRevision: observation.revision }),
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, "stale_revision");
  assert.equal(typeof stale.body.checkpoint, "string");

  const tooLarge = await request(url, "/api/observe", json({ sessionId, checkpoint: "x".repeat(300_000) }));
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.body.error.code, "request_too_large");
});

test("server rejects malformed requests and never reads arbitrary static paths", async () => {
  const { url } = await runningServer();
  const malformed = await request(url, "/api/start", json({ seed: "nine" }));
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error.code, "invalid_request");

  const invalidJson = await request(url, "/api/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{broken",
  });
  assert.equal(invalidJson.status, 400);

  const packagePath = await request(url, "/package.json", { method: "GET" });
  assert.equal(packagePath.status, 404);
  assert.equal(packagePath.raw.includes('"scripts"'), false);

  const traversal = await request(url, "/api/../package.json", { method: "GET" });
  assert.equal(traversal.status, 404);

  const staticPage = await request(url, "/", { method: "GET" });
  assert.equal(staticPage.status, 200);
  assert.match(staticPage.raw, /The Split Tide/);
  assert.equal(staticPage.raw.includes("GameState"), false);
});
