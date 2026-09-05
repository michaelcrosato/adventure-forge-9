import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createPlayerServer } from "../src/player/server.js";

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

async function runningServer(): Promise<{ server: Server; url: string }> {
  const server = createPlayerServer();
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${address.port}` };
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

  const saved = await request(url, '/api/save', json({ sessionId: created.body.sessionId }));
  assert.equal(saved.status, 200);
  const loaded = await request(url, '/api/restore', json({ serialized: saved.body.serialized }));
  assert.equal(loaded.status, 201);
  assert.notEqual(loaded.body.sessionId, created.body.sessionId);
  assert.deepEqual(loaded.body.observation, chosen.body.observation);
  assert.equal(loaded.body.observation.journal.length, 1);

  const closed = await request(url, '/api/end', json({ sessionId: loaded.body.sessionId, expectedRevision: loaded.body.observation.revision }));
  assert.equal(closed.status, 200);
  assert.equal(closed.body.observation.status, 'departed');
  const original = await request(url, '/api/observe?sessionId=' + encodeURIComponent(created.body.sessionId));
  assert.deepEqual(original.body.observation, chosen.body.observation, 'restored session must evolve independently');
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
