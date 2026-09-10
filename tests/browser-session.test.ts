import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { choose, observe, save, start, type GameState } from "../src/engine/index.js";
import { APP_JS } from "../src/player/web.js";

const CHECKPOINT_KEY = "adventure-forge-checkpoint";
const SESSION_KEY = "adventure-forge-session";

class Element {
  textContent = "";
  className = "";
  disabled = false;
  hidden = false;
  value = "";
  clicks = 0;
  dataset: Record<string, string> = {};
  children: Element[] = [];
  files: { text(): Promise<string> }[] = [];
  classList = { toggle() {} };
  listeners = new Map<string, (event: { target: Element }) => unknown>();

  addEventListener(name: string, listener: (event: { target: Element }) => unknown): void {
    this.listeners.set(name, listener);
  }
  append(...children: Element[]): void { this.children.push(...children); }
  replaceChildren(...children: Element[]): void { this.children = children; }
  setAttribute(): void {}
  focus(): void {}
  scrollIntoView(): void {}
  click(): void { this.clicks++; }

  // Invoke listeners even when disabled to exercise their in-flight guards,
  // including a file picker that was opened before the request started.
  dispatch(name: string): void { void this.listeners.get(name)?.({ target: this }); }
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void; reject(reason: Error): void } {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function storage(values = new Map<string, string>()) {
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

interface Response {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

function browser(options: { checkpoint?: string; sessionId?: string } = {}) {
  const elements = new Map<string, Element>();
  const element = (id: string): Element => {
    let value = elements.get(id);
    if (!value) { value = new Element(); elements.set(id, value); }
    return value;
  };
  const localStorage = storage();
  const sessionStorage = storage();
  if (options.checkpoint) localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
    sessionId: options.sessionId ?? "existing-session", checkpoint: options.checkpoint,
  }));
  if (options.sessionId) sessionStorage.setItem(SESSION_KEY, options.sessionId);
  const requests: { path: string; body: Record<string, unknown>; response: ReturnType<typeof deferred<Response>> }[] = [];
  runInNewContext(APP_JS, {
    document: { getElementById: element, createElement: () => new Element() },
    localStorage,
    sessionStorage,
    fetch(path: string, init: { body: string }) {
      const response = deferred<Response>();
      requests.push({ path, body: JSON.parse(init.body) as Record<string, unknown>, response });
      return response.promise;
    },
  });
  return {
    element, requests, localStorage, sessionStorage,
    respond(index: number, payload: unknown, status = 200) {
      requests[index]!.response.resolve({ ok: status >= 200 && status < 300, status, json: async () => payload });
    },
  };
}

function payload(state: GameState, sessionId = "journey-one") {
  return { sessionId, checkpoint: save(state), observation: observe(state) };
}

async function settle(): Promise<void> { await new Promise<void>(resolve => setImmediate(resolve)); }

function assertLocked(page: ReturnType<typeof browser>): void {
  for (const id of ["new-button", "load-button", "load-input", "save-button", "leave-button", "export-button"]) {
    assert.equal(page.element(id).disabled, true, `${id} must be disabled during a request`);
  }
}

test("pending startup and choices cannot be overwritten by overlapping new or load requests", async () => {
  const page = browser();
  const initial = start(1);
  assert.equal(page.requests[0]!.path, "/api/start");
  assertLocked(page);
  page.element("new-button").dispatch("click");
  page.element("load-button").dispatch("click");
  let fileReads = 0;
  page.element("load-input").files = [{ async text() { fileReads++; return save(initial); } }];
  page.element("load-input").dispatch("change");
  assert.equal(page.requests.length, 1);
  assert.equal(fileReads, 0);
  assert.equal(page.element("load-input").clicks, 0);

  page.respond(0, payload(initial), 201);
  await settle();
  assert.equal(page.element("new-button").disabled, false);
  assert.equal(page.element("save-button").disabled, false);
  const firstChoice = observe(initial).choices[0]!;
  const oldChoiceButton = page.element("choices").children[0]!;
  oldChoiceButton.dispatch("click");
  assertLocked(page);
  oldChoiceButton.dispatch("click");
  page.element("new-button").dispatch("click");
  page.element("load-input").dispatch("change");
  assert.equal(page.requests.length, 2);
  assert.equal(fileReads, 0);
  assert.equal(page.requests[1]!.body.checkpoint, save(initial));

  const next = choose(initial, firstChoice.id, initial.revision);
  page.respond(1, payload(next));
  await settle();
  assert.equal(page.element("scene-title").textContent, observe(next).title);
  assert.deepEqual(JSON.parse(page.localStorage.getItem(CHECKPOINT_KEY)!), {
    sessionId: "journey-one", checkpoint: save(next),
  });
  page.element("new-button").dispatch("click");
  page.element("new-button").dispatch("click");
  assert.equal(page.requests.length, 3, "a new journey is allowed once the previous operation completes");
  page.respond(2, payload(start(2), "journey-two"), 201);
  await settle();
  assert.equal(JSON.parse(page.localStorage.getItem(CHECKPOINT_KEY)!).sessionId, "journey-two");
});

test("file reads hold the session lock and a failed load preserves the current journey", async () => {
  const page = browser();
  const initial = start(2);
  page.respond(0, payload(initial), 201);
  await settle();
  page.element("load-button").dispatch("click");
  assert.equal(page.element("load-input").clicks, 1);
  const read = deferred<string>();
  page.element("load-input").files = [{ text: () => read.promise }];
  page.element("load-input").dispatch("change");
  assertLocked(page);
  page.element("new-button").dispatch("click");
  page.element("choices").children[0]!.dispatch("click");
  page.element("load-input").dispatch("change");
  assert.equal(page.requests.length, 1);
  read.reject(new Error("File read failed"));
  await settle();
  assert.match(page.element("notice").textContent, /Load refused: File read failed/);
  assert.equal(page.element("new-button").disabled, false);
  assert.equal(page.element("save-button").disabled, false);
  assert.equal(JSON.parse(page.localStorage.getItem(CHECKPOINT_KEY)!).checkpoint, save(initial));

  const loaded = start(3);
  page.element("load-input").files = [{ text: async () => save(loaded) }];
  page.element("load-input").dispatch("change");
  await settle();
  assertLocked(page);
  assert.equal(page.requests[1]!.path, "/api/restore");
  assert.equal(page.requests[1]!.body.serialized, save(loaded));
  page.element("new-button").dispatch("click");
  assert.equal(page.requests.length, 2);
  page.respond(1, { error: { message: "That save cannot be loaded." } }, 400);
  await settle();
  assert.equal(JSON.parse(page.localStorage.getItem(CHECKPOINT_KEY)!).checkpoint, save(initial));
  assert.equal(page.element("load-button").disabled, false);

  page.element("load-input").dispatch("change");
  await settle();
  page.respond(2, payload(loaded, "loaded-journey"), 201);
  await settle();
  assert.equal(JSON.parse(page.localStorage.getItem(CHECKPOINT_KEY)!).checkpoint, save(loaded));
  assert.equal(page.element("leave-button").disabled, false);
});

test("an expired session without a checkpoint starts one replacement journey", async () => {
  const page = browser({ sessionId: "expired-session" });
  assert.equal(page.requests[0]!.path, "/api/observe");
  assertLocked(page);
  page.respond(0, { error: { message: "Session expired" } }, 404);
  await settle();
  assert.equal(page.requests.length, 2);
  assert.equal(page.requests[1]!.path, "/api/start");
  assertLocked(page);
  page.element("new-button").dispatch("click");
  assert.equal(page.requests.length, 2);
  page.respond(1, payload(start(4), "replacement"), 201);
  await settle();
  assert.equal(page.sessionStorage.getItem(SESSION_KEY), "replacement");
  assert.equal(page.element("new-button").disabled, false);
  assert.equal(page.element("leave-button").disabled, false);
});

test("failed checkpoint recovery retains save access without enabling unavailable game actions", async () => {
  const checkpoint = save(start(5));
  const page = browser({ sessionId: "saved-session", checkpoint });
  page.requests[0]!.response.reject(new Error("Connection interrupted"));
  await settle();
  assert.equal(page.requests.length, 1);
  assert.equal(JSON.parse(page.localStorage.getItem(CHECKPOINT_KEY)!).checkpoint, checkpoint);
  assert.equal(page.element("save-button").disabled, false);
  assert.equal(page.element("load-button").disabled, false);
  assert.equal(page.element("new-button").disabled, false);
  assert.equal(page.element("leave-button").disabled, true);
  assert.equal(page.element("export-button").disabled, true);
  assert.equal(page.element("scene-title").textContent, "Your saved journey is safe.");
});
