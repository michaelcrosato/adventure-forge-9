import { randomUUID } from "node:crypto";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { pathToFileURL } from "node:url";
import { choose, end, observe, restore, save, start } from "../engine/index.js";
import type { GameState, Observation } from "../engine/index.js";
import { publicObservation } from "./render.js";
import { APP_JS, PAGE_HTML, STYLES_CSS } from "./web.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3009;
const DEFAULT_MAX_BODY_BYTES = 256 * 1024;

export interface PlayerServerOptions {
  host?: string;
  port?: number;
  maxBodyBytes?: number;
  logger?: (message: string) => void;
}

export interface PlayerServer extends Server {
  /** Number of live sessions, exposed for local tests and diagnostics only. */
  readonly sessionCount: () => number;
}

/** Vercel's Node adapter parses the request body before invoking a handler. */
export type VercelRequest = IncomingMessage & { body?: unknown };

interface Session {
  state: GameState;
}

interface RequestErrorDetails {
  code: string;
  message: string;
  status: number;
}

class RequestError extends Error {
  public readonly details: RequestErrorDetails;

  public constructor(details: RequestErrorDetails) {
    super(details.message);
    this.name = "RequestError";
    this.details = details;
  }
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown): JsonObject {
  if (!isObject(value)) {
    throw new RequestError({ code: "invalid_request", message: "Request JSON must be an object.", status: 400 });
  }
  return value;
}

function assertKeys(value: JsonObject, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new RequestError({ code: "invalid_request", message: `Unknown request field: ${key}.`, status: 400 });
    }
  }
}

function requiredString(value: unknown, field: string, maxLength = 256): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength || value.includes("\0")) {
    throw new RequestError({ code: "invalid_request", message: `A valid ${field} is required.`, status: 400 });
  }
  return value;
}

function requiredRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new RequestError({ code: "invalid_request", message: "expectedRevision must be a non-negative integer.", status: 400 });
  }
  return value;
}

function optionalSeed(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new RequestError({ code: "invalid_request", message: "seed must be an integer.", status: 400 });
  }
  return value;
}

function sessionId(value: unknown): string {
  return requiredString(value, "sessionId", 128);
}

function operationError(error: unknown): { code: string; message: string; status: number } {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("revision") || message.includes("stale")) {
    return { code: "stale_revision", message: "This view is out of date. Refresh and choose again.", status: 409 };
  }
  if (message.includes("choice") || message.includes("action") || message.includes("legal")) {
    return { code: "illegal_choice", message: "That choice is not available from this scene.", status: 422 };
  }
  return { code: "operation_failed", message: "The crossing could not complete that operation.", status: 422 };
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.end(body);
}

function sendText(response: ServerResponse, status: number, contentType: string, body: string): void {
  response.statusCode = status;
  response.setHeader("content-type", contentType);
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.end(body);
}

async function readJson(request: VercelRequest, maxBodyBytes: number): Promise<unknown> {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  const declaredLength = Number(request.headers["content-length"] ?? "");
  if (Number.isSafeInteger(declaredLength) && declaredLength > maxBodyBytes) {
    throw new RequestError({ code: "request_too_large", message: "Request body is too large.", status: 413 });
  }

  // Vercel's Node runtime may expose a parsed body while the request stream
  // has already been consumed. Validate its serialized size before using it.
  if ("body" in request) {
    if (request.body === undefined) {
      if (contentType.length === 0 || contentType.startsWith("application/json")) return {};
      throw new RequestError({ code: "invalid_request", message: "Use application/json for API requests.", status: 400 });
    }
    if (contentType.length > 0 && !contentType.startsWith("application/json")) {
      throw new RequestError({ code: "invalid_request", message: "Use application/json for API requests.", status: 400 });
    }
    let serialized: string;
    try {
      serialized = JSON.stringify(request.body) ?? "";
    } catch {
      throw new RequestError({ code: "invalid_request", message: "Request JSON could not be read.", status: 400 });
    }
    if (Buffer.byteLength(serialized, "utf8") > maxBodyBytes) {
      throw new RequestError({ code: "request_too_large", message: "Request body is too large.", status: 413 });
    }
    return request.body;
  }

  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > maxBodyBytes) {
      throw new RequestError({ code: "request_too_large", message: "Request body is too large.", status: 413 });
    }
    chunks.push(buffer);
  }

  if (length === 0) {
    // A bodyless POST is useful for the default-seed start operation. Once a
    // body exists, insist on JSON instead of silently accepting form data.
    if (contentType.length === 0 || contentType.startsWith("application/json")) return {};
    throw new RequestError({ code: "invalid_request", message: "Use application/json for API requests.", status: 400 });
  }
  if (!contentType.startsWith("application/json")) {
    throw new RequestError({ code: "invalid_request", message: "Use application/json for API requests.", status: 400 });
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new RequestError({ code: "invalid_json", message: "Request body is not valid JSON.", status: 400 });
  }
}

function routeFor(pathname: string): { operation: string; sessionId?: string } | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "api") return undefined;

  if (segments.length === 2 && ["start", "new"].includes(segments[1] ?? "")) {
    return { operation: "start" };
  }
  if (segments.length === 2 && ["observe", "choose", "end", "save", "restore", "load"].includes(segments[1] ?? "")) {
    return { operation: segments[1] ?? "" };
  }
  if (segments[1] === "session") {
    if (segments.length === 2) return { operation: "start" };
    if (segments.length === 3) return { operation: "observe", sessionId: segments[2] };
    if (segments.length === 4 && ["observe", "choose", "end", "save"].includes(segments[3] ?? "")) {
      return { operation: segments[3] ?? "", sessionId: segments[2] };
    }
  }
  return undefined;
}

function lookup(sessions: Map<string, Session>, rawId: unknown): { id: string; session: Session } {
  const id = sessionId(rawId);
  const session = sessions.get(id);
  if (!session) {
    throw new RequestError({ code: "session_not_found", message: "That crossing session no longer exists.", status: 404 });
  }
  return { id, session };
}

function optionalCheckpoint(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredString(value, "checkpoint", maxLength);
}

function lookupOrRestore(
  sessions: Map<string, Session>,
  rawId: unknown,
  checkpoint: string | undefined,
): { id: string; session: Session } {
  const id = sessionId(rawId);
  const existing = sessions.get(id);
  if (existing) return { id, session: existing };
  if (checkpoint === undefined) {
    throw new RequestError({ code: "session_not_found", message: "That crossing session no longer exists.", status: 404 });
  }
  let state: GameState;
  try {
    state = restore(checkpoint);
  } catch {
    throw new RequestError({ code: "invalid_save", message: "That save cannot be loaded.", status: 400 });
  }
  const session = { state };
  sessions.set(id, session);
  return { id, session };
}

function observationPayload(id: string, state: GameState): { sessionId: string; observation: Observation; checkpoint: string } {
  return { sessionId: id, observation: publicObservation(observe(state)), checkpoint: save(state) };
}

async function handleRequest(
  request: VercelRequest,
  response: ServerResponse,
  sessions: Map<string, Session>,
  maxBodyBytes: number,
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = requestUrl.pathname;

  if (request.method === "GET" && pathname === "/") {
    sendText(response, 200, "text/html; charset=utf-8", PAGE_HTML);
    return;
  }
  if (request.method === "GET" && pathname === "/index.html") {
    sendText(response, 200, "text/html; charset=utf-8", PAGE_HTML);
    return;
  }
  if (request.method === "GET" && pathname === "/styles.css") {
    sendText(response, 200, "text/css; charset=utf-8", STYLES_CSS);
    return;
  }
  if (request.method === "GET" && pathname === "/app.js") {
    sendText(response, 200, "application/javascript; charset=utf-8", APP_JS);
    return;
  }

  const route = routeFor(pathname);
  if (!route) {
    sendJson(response, 404, { error: { code: "not_found", message: "Route not found." } });
    return;
  }

  try {
    const method = request.method ?? "GET";
    const body = method === "POST" ? await readJson(request, maxBodyBytes) : {};
    const data = requireObject(body);

    if (route.operation === "start") {
      if (method !== "POST") {
        throw new RequestError({ code: "method_not_allowed", message: "Use POST for a new crossing.", status: 405 });
      }
      assertKeys(data, ["seed"]);
      const state = start(optionalSeed(data.seed));
      const id = randomUUID();
      sessions.set(id, { state });
      sendJson(response, 201, observationPayload(id, state));
      return;
    }

    let idFromRoute = route.sessionId;
    if (idFromRoute !== undefined) {
      try {
        idFromRoute = decodeURIComponent(idFromRoute);
      } catch {
        throw new RequestError({ code: "invalid_request", message: "Session ID is malformed.", status: 400 });
      }
    }

    if (route.operation === "observe") {
      if (method === "GET") {
        const id = idFromRoute ?? requestUrl.searchParams.get("sessionId");
        const found = lookup(sessions, id);
        sendJson(response, 200, observationPayload(found.id, found.session.state));
        return;
      }
      if (method !== "POST") {
        throw new RequestError({ code: "method_not_allowed", message: "Use GET or POST to observe a crossing.", status: 405 });
      }
      assertKeys(data, ["sessionId", "checkpoint"]);
      const found = lookupOrRestore(sessions, idFromRoute ?? data.sessionId, optionalCheckpoint(data.checkpoint, maxBodyBytes));
      sendJson(response, 200, observationPayload(found.id, found.session.state));
      return;
    }

    if (route.operation === "choose") {
      if (method !== "POST") {
        throw new RequestError({ code: "method_not_allowed", message: "Use POST to choose a bearing.", status: 405 });
      }
      assertKeys(data, ["sessionId", "checkpoint", "id", "expectedRevision"]);
      const found = lookupOrRestore(sessions, idFromRoute ?? data.sessionId, optionalCheckpoint(data.checkpoint, maxBodyBytes));
      const choiceId = requiredString(data.id, "choice id", 128);
      const expectedRevision = requiredRevision(data.expectedRevision);
      try {
        found.session.state = choose(found.session.state, choiceId, expectedRevision);
      } catch (error) {
        const failure = operationError(error);
        sendJson(response, failure.status, {
          error: { code: failure.code, message: failure.message },
          ...observationPayload(found.id, found.session.state),
        });
        return;
      }
      sendJson(response, 200, observationPayload(found.id, found.session.state));
      return;
    }

    if (route.operation === "end") {
      if (method !== "POST") {
        throw new RequestError({ code: "method_not_allowed", message: "Use POST to end a crossing.", status: 405 });
      }
      assertKeys(data, ["sessionId", "checkpoint", "expectedRevision"]);
      const found = lookupOrRestore(sessions, idFromRoute ?? data.sessionId, optionalCheckpoint(data.checkpoint, maxBodyBytes));
      const expectedRevision = requiredRevision(data.expectedRevision);
      try {
        found.session.state = end(found.session.state, expectedRevision);
      } catch (error) {
        const failure = operationError(error);
        sendJson(response, failure.status, {
          error: { code: failure.code, message: failure.message },
          ...observationPayload(found.id, found.session.state),
        });
        return;
      }
      sendJson(response, 200, observationPayload(found.id, found.session.state));
      return;
    }

    if (route.operation === "save") {
      if (method !== "POST") {
        throw new RequestError({ code: "method_not_allowed", message: "Use POST to export a save.", status: 405 });
      }
      assertKeys(data, ["sessionId", "checkpoint"]);
      const found = lookupOrRestore(sessions, idFromRoute ?? data.sessionId, optionalCheckpoint(data.checkpoint, maxBodyBytes));
      const serialized = save(found.session.state);
      sendJson(response, 200, { sessionId: found.id, serialized, checkpoint: serialized });
      return;
    }

    if (route.operation === "restore" || route.operation === "load") {
      if (method !== "POST") {
        throw new RequestError({ code: "method_not_allowed", message: "Use POST to load a save.", status: 405 });
      }
      assertKeys(data, ["serialized"]);
      const serialized = requiredString(data.serialized, "serialized save", maxBodyBytes);
      let state: GameState;
      try {
        state = restore(serialized);
      } catch {
        throw new RequestError({ code: "invalid_save", message: "That save cannot be loaded.", status: 400 });
      }
      const id = randomUUID();
      sessions.set(id, { state });
      sendJson(response, 201, observationPayload(id, state));
      return;
    }

    throw new RequestError({ code: "not_found", message: "Route not found.", status: 404 });
  } catch (error) {
    if (error instanceof RequestError) {
      sendJson(response, error.details.status, { error: { code: error.details.code, message: error.details.message } });
      return;
    }
    sendJson(response, 500, { error: { code: "internal_error", message: "The crossing server could not complete that request." } });
  }
}

/** Stateless deployment entry: each request reconstructs its session from a checkpoint. */
export async function handleVercelRequest(request: VercelRequest, response: ServerResponse): Promise<void> {
  await handleRequest(request, response, new Map<string, Session>(), DEFAULT_MAX_BODY_BYTES);
}

export const vercelHandler = handleVercelRequest;

export function createPlayerServer(options: PlayerServerOptions = {}): PlayerServer {
  const sessions = new Map<string, Session>();
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const server = createHttpServer((request, response) => {
    void handleRequest(request, response, sessions, maxBodyBytes).catch(() => {
      if (!response.headersSent) {
        sendJson(response, 500, { error: { code: "internal_error", message: "The crossing server could not complete that request." } });
      } else if (!response.writableEnded) {
        response.destroy();
      }
    });
  }) as PlayerServer;
  Object.defineProperty(server, "sessionCount", {
    value: () => sessions.size,
    enumerable: false,
  });
  return server;
}

export const createServer = createPlayerServer;

export async function startServer(options: PlayerServerOptions = {}): Promise<PlayerServer> {
  const host = options.host ?? process.env.ADVENTURE_HOST ?? DEFAULT_HOST;
  const port = options.port ?? parsePort(process.env.PORT) ?? DEFAULT_PORT;
  const server = createPlayerServer(options);
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  (options.logger ?? console.log)(`Adventure Forge listening on http://${host}:${actualPort}`);
  return server;
}

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const port = Number(value);
  return Number.isInteger(port) && port >= 0 && port <= 65535 ? port : undefined;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && pathToFileURL(entry).href === import.meta.url);
}

if (isMainModule()) {
  void startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown server error";
    process.stderr.write(`Unable to start the local browser server: ${message}\n`);
    process.exitCode = 1;
  });
}
