import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import { promisify } from 'node:util';
import { assertEffectiveIsolation, buildIsolationConfig, SUPPORTED_CLIENT_VERSION } from './isolation.js';
import { PLAYER_INSTRUCTION } from './prompts.js';

const execFileAsync = promisify(execFile);

const REQUEST_TIMEOUT_MS = 30_000;
const TURN_TIMEOUT_MS = 10 * 60_000;

type JsonObject = Record<string, unknown>;
type RpcId = number | string;
type EventCallback = (kind: string, data: unknown) => void;

type IsolationBuild = {
  cwd: string;
  config: Record<string, unknown>;
  catalog: unknown;
  verification: Record<string, unknown>;
  cliArgs: string[];
  cleanup: () => void | Promise<void>;
};

type PendingRequest = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type ActiveTurn = {
  turnId?: string;
  finalText?: string;
  finalPhase?: string;
  deltaText: string;
  resolve: (text: string) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type ThreadMetadata = {
  id?: string;
  sessionId?: string;
  model?: string;
  modelProvider?: string;
  reasoningEffort?: string;
  cliVersion?: string;
  cwd?: string;
  ephemeral?: boolean;
  instructionSources?: unknown;
  runtimeWorkspaceRoots?: unknown;
  sandbox?: unknown;
  approvalPolicy?: unknown;
};

const SAFE_NOTIFICATIONS = new Set([
  'error',
  'warning',
  'configWarning',
  'deprecationNotice',
  'guardianWarning',
  'thread/started',
  'thread/status/changed',
  'thread/closed',
  'thread/name/updated',
  'thread/goal/updated',
  'thread/goal/cleared',
  'thread/queue/changed',
  'thread/tokenUsage/updated',
  'thread/compacted',
  'turn/started',
  'turn/completed',
  'turn/diff/updated',
  'turn/plan/updated',
  'turn/moderationMetadata',
  'item/started',
  'item/completed',
  'item/agentMessage/delta',
  'item/reasoning/summaryTextDelta',
  'item/reasoning/summaryPartAdded',
  'item/reasoning/textDelta',
  'serverRequest/resolved',
  'account/updated',
  'skills/changed',
  'model/verification',
  'model/safetyBuffering/updated',
  'modelProvider/authRecoveryStarted',
  'modelProvider/authRecoveryCompleted',
  'account/rateLimits/updated',
  'remoteControl/status/changed',
  'mcpServer/startupStatus/updated',
  'app/list/updated',
]);

const FORBIDDEN_NOTIFICATIONS = new Set([
  'currentTime/read',
  'model/rerouted',
  'command/exec/outputDelta',
  'process/outputDelta',
  'process/exited',
  'item/commandExecution/outputDelta',
  'item/commandExecution/terminalInteraction',
  'item/fileChange/outputDelta',
  'item/fileChange/patchUpdated',
  'item/mcpToolCall/progress',
  'fs/changed',
]);

const FORBIDDEN_REQUESTS = new Set([
  'item/commandExecution/requestApproval',
  'item/fileChange/requestApproval',
  'item/permissions/requestApproval',
  'item/tool/requestUserInput',
  'item/tool/call',
  'mcpServer/elicitation/request',
  'account/chatgptAuthTokens/refresh',
  'applyPatchApproval',
  'execCommandApproval',
]);

const FORBIDDEN_ITEM_TYPES = new Set([
  'commandExecution',
  'fileChange',
  'mcpToolCall',
  'dynamicToolCall',
  'collabAgentToolCall',
  'subAgentActivity',
  'webSearch',
  'imageView',
  'imageGeneration',
  'sleep',
  'functionCallOutput',
]);

const SAFE_ITEM_TYPES = new Set([
  'userMessage',
  'agentMessage',
  'reasoning',
  'plan',
  'contextCompaction',
  'enteredReviewMode',
  'exitedReviewMode',
]);

const SENSITIVE_KEY = /(?:token|secret|password|authorization|api[-_]?key|credential|cookie|email|headers?)/i;

export type CodexPlayerOptions = {
  model: string;
  effort: string;
  onEvent: EventCallback;
};

export type CodexPlayerMetadata = {
  authMode: 'chatgpt';
  provider: 'openai';
  clientVersion: string;
  model: string;
  effort: string;
  reportedProvider: string | null;
  threadId: string;
  sessionId: string | null;
  reportedModel: string | null;
  reportedEffort: string | null;
  isolation: {
    verified: boolean;
    sourceVerification: Record<string, unknown>;
    configVerified: boolean;
    verifiedOverrides: Record<string, unknown>;
    environments: [];
    dynamicTools: [];
    runtimeWorkspaceRoots: [];
    instructionSources: [];
    cwd: string;
    sandbox: { type: 'readOnly'; networkAccess: false };
    approvalPolicy: 'never';
    modelCatalog: Record<string, unknown>;
  };
};

export class CodexPlayer {
  private readonly model: string;
  private readonly effort: string;
  private readonly onEvent: EventCallback;
  private child?: ChildProcessWithoutNullStreams;
  private lines?: Interface;
  private isolation?: IsolationBuild;
  private pending = new Map<RpcId, PendingRequest>();
  private activeTurn?: ActiveTurn;
  private nextRequestId = 0;
  private initialized = false;
  private closing = false;
  private boundaryError?: Error;
  private cleanupComplete = false;
  private threadMetadata?: ThreadMetadata;
  private _threadId = '';

  constructor(options: CodexPlayerOptions) {
    if (!options.model.trim()) throw new Error('Codex player model is required');
    if (!options.effort.trim()) throw new Error('Codex player reasoning effort is required');
    this.model = options.model;
    this.effort = options.effort;
    this.onEvent = options.onEvent;
  }

  get threadId() {
    return this._threadId;
  }

  async initialize(): Promise<CodexPlayerMetadata> {
    if (this.initialized) throw new Error('Codex player is already initialized');

    const isolation = await buildIsolationConfig(this.model) as unknown as IsolationBuild;
    this.isolation = isolation;
    if (!isolation.cwd || !Array.isArray(isolation.cliArgs)) {
      throw new Error('Isolation helper returned an incomplete launch configuration');
    }

    const catalogEntry = catalogModelEntry(isolation.catalog, this.model);
    const supportedEfforts = supportedEffortsFrom(catalogEntry, isolation.verification);
    if (supportedEfforts.length > 0 && !supportedEfforts.includes(this.effort)) {
      throw new Error(`Reasoning effort ${this.effort} is not supported by model ${this.model}`);
    }
    const launchConfig = { ...isolation.config, model_reasoning_effort: this.effort };
    const launchArgs = [
      ...isolation.cliArgs,
      '-c',
      `model_reasoning_effort=${JSON.stringify(this.effort)}`,
    ];

    const command = process.env.CODEX_BIN ?? 'codex';
    await this.assertChatGptAuth(command, isolation.cwd);
    this.child = spawn(command, ['app-server', ...launchArgs], {
      cwd: isolation.cwd,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', line => this.receiveLine(line));
    this.child.stderr.on('data', () => {
      // Diagnostics can contain paths or provider details. The evidence contract
      // records protocol responses only, so stderr is deliberately not forwarded.
    });
    this.child.on('error', error => this.failAll(new Error(`Codex App Server process failed: ${error.message}`)));
    this.child.on('exit', (code, signal) => {
      if (!this.closing) this.failAll(new Error(`Codex App Server exited (${code ?? 'signal ' + signal})`));
    });

    try {
      const initialize = await this.request<JsonObject>('initialize', {
        clientInfo: { name: 'adventure-forge-9-playtest', version: '0.1.0' },
        capabilities: { experimentalApi: true },
      });
      const userAgent = typeof initialize.userAgent === 'string' ? initialize.userAgent : '';
      if (!userAgent.includes(SUPPORTED_CLIENT_VERSION.replace('codex-cli ', ''))) {
        throw new Error(`Unsupported Codex App Server version; expected ${SUPPORTED_CLIENT_VERSION}`);
      }
      this.send({ method: 'initialized' });

      const configResponse = await this.request<JsonObject>('config/read', { includeLayers: true });
      const effectiveConfig = asObject(configResponse.config);
      const layers = Array.isArray(configResponse.layers) ? configResponse.layers.filter(asObjectValue) : [];
      assertEffectiveIsolation(effectiveConfig, launchConfig, layers);
      const configVerified = true;

      const accountResponse = await this.request<JsonObject>('account/read', { refreshToken: false });
      const account = asObject(accountResponse.account);
      if (account.type !== 'chatgpt') {
        throw new Error('Codex App Server is not authenticated with a ChatGPT subscription');
      }

      const threadResponse = await this.request<JsonObject>('thread/start', {
        model: this.model,
        modelProvider: 'openai',
        config: { model_reasoning_effort: this.effort },
        cwd: isolation.cwd,
        runtimeWorkspaceRoots: [],
        environments: [],
        dynamicTools: [],
        ephemeral: true,
        historyMode: 'legacy',
        approvalPolicy: 'never',
        approvalsReviewer: 'user',
        sandbox: 'read-only',
        baseInstructions: PLAYER_INSTRUCTION,
        developerInstructions: '',
        selectedCapabilityRoots: [],
        threadSource: 'adventure-forge-9',
      });
      const thread = asObject(threadResponse.thread);
      this.threadMetadata = thread as ThreadMetadata;
      this._threadId = requiredString(thread.id, 'thread/start did not return a thread ID');
      const sessionId = optionalString(thread.sessionId);
      const reportedModel = optionalString(thread.model) ?? optionalString(threadResponse.model);
      const reportedEffort = optionalString(thread.reasoningEffort) ?? optionalString(threadResponse.reasoningEffort);
      const reportedProvider = optionalString(thread.modelProvider) ?? optionalString(threadResponse.modelProvider);
      const cliVersion = optionalString(thread.cliVersion) ?? optionalString(threadResponse.cliVersion);
      const instructionSources = Array.isArray(threadResponse.instructionSources)
        ? threadResponse.instructionSources
        : Array.isArray(thread.instructionSources) ? thread.instructionSources : [];
      const runtimeWorkspaceRoots = Array.isArray(threadResponse.runtimeWorkspaceRoots)
        ? threadResponse.runtimeWorkspaceRoots
        : Array.isArray(thread.runtimeWorkspaceRoots) ? thread.runtimeWorkspaceRoots : [];
      const sandbox = asObject(threadResponse.sandbox ?? thread.sandbox);
      const approvalPolicy = threadResponse.approvalPolicy ?? thread.approvalPolicy;

      if (reportedModel !== this.model) throw new Error(`Isolation model mismatch: expected ${this.model}`);
      if (reportedProvider !== 'openai') throw new Error(`Isolation provider mismatch: expected openai`);
      if (cliVersion !== SUPPORTED_CLIENT_VERSION.replace('codex-cli ', '')) {
        throw new Error(`Thread reported unsupported Codex version: ${cliVersion}`);
      }
      if (reportedEffort !== this.effort) {
        throw new Error(`Reasoning effort mismatch: expected ${this.effort}`);
      }
      if (thread.ephemeral !== true) throw new Error('Isolation thread is not ephemeral');
      if (instructionSources.length !== 0) throw new Error('Isolation thread loaded project instructions');
      if (runtimeWorkspaceRoots.length !== 0) throw new Error('Isolation thread has runtime workspace roots');
      if (sandbox.type !== 'readOnly' || sandbox.networkAccess !== false) {
        throw new Error('Isolation sandbox is not read-only with network disabled');
      }
      if (approvalPolicy !== 'never') throw new Error('Isolation approval policy is not never');
      if (this.boundaryError) throw this.boundaryError;

      const sourceVerification = safeObject(isolation.verification);
      const metadata: CodexPlayerMetadata = {
        authMode: 'chatgpt',
        provider: 'openai',
        clientVersion: SUPPORTED_CLIENT_VERSION,
        model: this.model,
        effort: this.effort,
        reportedProvider: reportedProvider ?? null,
        threadId: this._threadId,
        sessionId: sessionId ?? null,
        reportedModel: reportedModel ?? null,
        reportedEffort: reportedEffort ?? null,
        isolation: {
          verified: configVerified,
          sourceVerification,
          configVerified,
          verifiedOverrides: safeFlatConfig(launchConfig),
          environments: [],
          dynamicTools: [],
          runtimeWorkspaceRoots: [],
          instructionSources: [],
          cwd: isolation.cwd,
          sandbox: { type: 'readOnly', networkAccess: false },
          approvalPolicy: 'never',
          modelCatalog: catalogProjection(isolation.catalog, this.model),
        },
      };
      this.initialized = true;
      this.emit('provider_initialized', {
        threadId: metadata.threadId,
        model: metadata.model,
        effort: metadata.effort,
        provider: metadata.provider,
        clientVersion: metadata.clientVersion,
        isolation: metadata.isolation,
      });
      return metadata;
    } catch (error) {
      await this.stopProcess();
      await this.cleanup();
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async respond(prompt: string, schema?: object): Promise<string> {
    if (!this.initialized || !this.child || !this._threadId) throw new Error('Codex player is not initialized');
    if (this.boundaryError) throw this.boundaryError;
    if (this.activeTurn) throw new Error('A Codex turn is already active');
    if (!prompt) throw new Error('Codex player prompt is empty');

    let completionResolve!: (text: string) => void;
    let completionReject!: (error: Error) => void;
    const completion = new Promise<string>((resolve, reject) => {
      completionResolve = resolve;
      completionReject = reject;
    });
    const timer = setTimeout(() => completionReject(new Error('Codex turn timed out')), TURN_TIMEOUT_MS);
    this.activeTurn = { deltaText: '', resolve: completionResolve, reject: completionReject, timer };
    this.emit('player_prompt', {
      threadId: this._threadId,
      prompt,
      outputSchema: schema ?? null,
    });

    try {
      const turnRequest: JsonObject = {
        threadId: this._threadId,
        input: [{ type: 'text', text: prompt }],
        model: this.model,
        effort: this.effort,
        cwd: this.isolation?.cwd,
        runtimeWorkspaceRoots: [],
        environments: [],
        approvalPolicy: 'never',
        sandboxPolicy: { type: 'readOnly', networkAccess: false },
      };
      if (schema !== undefined) turnRequest.outputSchema = schema;
      const response = await this.request<JsonObject>('turn/start', turnRequest);
      const turn = asObject(response.turn);
      const turnId = optionalString(turn.id);
      if (!turnId) throw new Error('turn/start did not return a turn ID');
      if (this.activeTurn) this.activeTurn.turnId = turnId;
      return await completion;
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      // If turn/start itself fails, settle the completion promise immediately.
      // This prevents a later rejection from becoming an unhandled promise while
      // preserving the original provider/request error for the caller.
      completionReject(failure);
      await completion.catch(() => undefined);
      throw failure;
    } finally {
      const active = this.activeTurn;
      if (active) {
        clearTimeout(active.timer);
        this.activeTurn = undefined;
      }
    }
  }

  async close(): Promise<void> {
    await this.stopProcess();
    await this.cleanup();
  }

  private async assertChatGptAuth(command: string, cwd: string) {
    try {
      const result = await execFileAsync(command, ['login', 'status'], {
        cwd,
        env: { ...process.env, NO_COLOR: '1' },
        encoding: 'utf8',
        timeout: 15_000,
        maxBuffer: 16 * 1024,
      });
      const output = `${result.stdout}\n${result.stderr}`;
      if (!/logged in using chatgpt/i.test(output)) {
        throw new Error('Codex CLI is not using ChatGPT subscription authentication');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not using ChatGPT')) throw error;
      throw new Error('Unable to verify ChatGPT subscription authentication');
    }
  }

  private async request<T>(method: string, params: unknown): Promise<T> {
    if (this.boundaryError) throw this.boundaryError;
    const id = ++this.nextRequestId;
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex App Server request timed out: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { method, resolve: value => resolve(value as T), reject, timer });
      try {
        this.send({ id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private send(message: unknown) {
    if (!this.child?.stdin.writable) throw new Error('Codex App Server stdin is unavailable');
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }

  private receiveLine(line: string) {
    if (!line.trim()) return;
    let message: JsonObject;
    try {
      const parsed: unknown = JSON.parse(line);
      message = asObject(parsed);
    } catch {
      this.failAll(new Error('Codex App Server emitted invalid JSON'));
      return;
    }

    if (typeof message.method === 'string') {
      if (Object.prototype.hasOwnProperty.call(message, 'id')) this.handleServerRequest(message);
      else this.handleNotification(message.method, message.params);
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(message, 'id')) return;
    const id = message.id;
    if (!isRpcId(id)) return;
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    clearTimeout(pending.timer);
    if (message.error !== undefined) {
      const error = asObject(message.error);
      const code = typeof error.code === 'number' ? error.code : 'unknown';
      const messageText = typeof error.message === 'string' ? safeErrorMessage(error.message) : undefined;
      this.emit('provider_error', { method: pending.method, code, ...(messageText ? { message: messageText } : {}) });
      pending.reject(new Error(`Codex App Server rejected ${pending.method} (${code})`));
      return;
    }
    pending.resolve(message.result);
  }

  private handleServerRequest(message: JsonObject) {
    const method = typeof message.method === 'string' ? message.method : 'unknown';
    const id = message.id;
    if (isRpcId(id)) {
      try {
        this.send({ id, error: { code: -32001, message: 'Blind playtest exposes no client capabilities' } });
      } catch {
        // The process failure below is the useful diagnostic if stdin closed.
      }
    }
    this.violateBoundary('server_request', method, FORBIDDEN_REQUESTS.has(method) ? 'forbidden' : 'unexpected');
  }

  private handleNotification(method: string, params: unknown) {
    if (FORBIDDEN_NOTIFICATIONS.has(method)) {
      this.violateBoundary('notification', method, 'forbidden');
      return;
    }
    if (!SAFE_NOTIFICATIONS.has(method)) {
      this.violateBoundary('notification', method, 'unexpected');
      return;
    }

    const data = asObject(params);
    const turn = asObject(data.turn);
    const item = asObject(data.item);
    const eventThreadId = optionalString(data.threadId)
      ?? optionalString(turn.threadId)
      ?? optionalString(item.threadId);
    if (this._threadId && eventThreadId && eventThreadId !== this._threadId) {
      this.violateBoundary('notification', eventThreadId, 'cross-thread');
      return;
    }
    if ((method === 'item/started' || method === 'item/completed') && !this.validateItemType(item)) {
      return;
    }
    // `turn/completed` can carry the full item list even when individual item
    // notifications were not emitted. Audit that list before exposing it.
    if (Array.isArray(turn.items)) {
      for (const rawItem of turn.items) {
        if (!this.validateItemType(asObject(rawItem))) return;
      }
    }

    this.updateTurnFromNotification(method, data);
    this.emitProviderEvent(method, data);
  }

  private validateItemType(item: JsonObject): boolean {
    if (item.type === undefined) return true;
    const type = typeof item.type === 'string' ? item.type : 'unknown';
    if (FORBIDDEN_ITEM_TYPES.has(type)) {
      this.violateBoundary('item', type, 'forbidden');
      return false;
    }
    if (!SAFE_ITEM_TYPES.has(type)) {
      this.violateBoundary('item', type, 'unexpected');
      return false;
    }
    return true;
  }

  private updateTurnFromNotification(method: string, params: JsonObject) {
    const active = this.activeTurn;
    if (!active) return;
    const turn = asObject(params.turn);
    const turnId = optionalString(params.turnId) ?? optionalString(turn.id);
    if (turnId && !active.turnId) active.turnId = turnId;
    if (active.turnId && turnId && active.turnId !== turnId) return;

    if (method === 'item/agentMessage/delta') {
      const delta = typeof params.delta === 'string' ? params.delta : '';
      active.deltaText += delta;
    }
    if (method === 'item/completed') {
      const item = asObject(params.item);
      if (item.type === 'agentMessage' && typeof item.text === 'string') {
        const phase = typeof item.phase === 'string' ? item.phase : undefined;
        if (active.finalText === undefined || phase === 'final_answer' || active.finalPhase !== 'final_answer') {
          active.finalText = item.text;
          active.finalPhase = phase;
        }
      }
    }
    if (method === 'turn/completed') {
      const status = typeof turn.status === 'string' ? turn.status : 'unknown';
      if (status !== 'completed') {
        active.reject(new Error(`Codex turn did not complete (${status})`));
        return;
      }
      const turnText = extractFinalText(turn);
      const text = active.finalText ?? turnText ?? active.deltaText;
      if (!text) {
        active.reject(new Error('Codex turn completed without an agent response'));
        return;
      }
      active.resolve(text);
    }
  }

  private emitProviderEvent(method: string, params: JsonObject) {
    if (method === 'thread/tokenUsage/updated') {
      const usage = asObject(params.tokenUsage ?? params.usage);
      const total = numericProjection(asObject(usage.total ?? params.total), [
        'inputTokens', 'outputTokens', 'cachedInputTokens', 'reasoningOutputTokens', 'totalTokens',
      ]);
      const last = numericProjection(asObject(usage.last ?? params.last), [
        'inputTokens', 'outputTokens', 'cachedInputTokens', 'reasoningOutputTokens', 'totalTokens',
      ]);
      this.emit('provider_event', {
        method,
        threadId: this._threadId,
        tokenUsage: { total, last },
      });
      return;
    }
    if (method === 'account/rateLimits/updated') {
      const limits = asObject(params.rateLimits ?? params);
      const safeLimits = numericProjection(limits, ['usedPercent', 'windowDurationMins', 'resetsAt']);
      this.emit('provider_event', { method, rateLimits: safeLimits });
      return;
    }
    // Account and remote-control notifications are accepted for protocol
    // compatibility but never copied into evidence.
    if (method.startsWith('account/') || method.startsWith('remoteControl/')) {
      this.emit('provider_event', { method, present: true });
      return;
    }
    if (method === 'item/completed') {
      const item = asObject(params.item);
      const safeItem: JsonObject = { type: item.type, id: item.id };
      if (item.type === 'agentMessage' && typeof item.text === 'string') {
        safeItem.text = item.text;
        if (typeof item.phase === 'string') safeItem.phase = item.phase;
      } else if (item.type === 'reasoning') {
        if (Array.isArray(item.summary)) safeItem.summary = item.summary;
        if (Array.isArray(item.content)) safeItem.content = item.content;
      }
      this.emit('provider_event', { method, threadId: this._threadId, turnId: params.turnId, item: safeItem });
      return;
    }
    if (method === 'item/agentMessage/delta') {
      this.emit('provider_event', {
        method,
        threadId: this._threadId,
        turnId: params.turnId,
        itemId: params.itemId,
        delta: typeof params.delta === 'string' ? params.delta : '',
      });
      return;
    }
    this.emit('provider_event', { method, params: safeValue(params) });
  }

  private violateBoundary(kind: string, name: string, reason: string) {
    if (this.boundaryError) return;
    this.boundaryError = new Error(`Isolation boundary violated by ${kind}: ${name}`);
    this.emit('isolation_violation', { kind, name, reason });
    const active = this.activeTurn;
    if (active) active.reject(this.boundaryError);
    for (const pending of this.pending.values()) pending.reject(this.boundaryError);
    this.pending.clear();
  }

  private emit(kind: string, data: unknown) {
    this.onEvent(kind, data);
  }

  private failAll(error: Error) {
    if (this.closing) return;
    this.boundaryError ??= error;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    if (this.activeTurn) this.activeTurn.reject(error);
  }

  private async stopProcess() {
    const child = this.child;
    if (!child) return;
    this.closing = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Codex player closed'));
    }
    this.pending.clear();
    if (this.activeTurn) {
      clearTimeout(this.activeTurn.timer);
      this.activeTurn.reject(new Error('Codex player closed'));
      this.activeTurn = undefined;
    }
    this.lines?.close();
    if (child.stdin.writable) child.stdin.end();
    await new Promise<void>(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        if (!child.killed) child.kill('SIGTERM');
        resolve();
      }, 2_000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.child = undefined;
  }

  private async cleanup() {
    if (this.cleanupComplete) return;
    this.cleanupComplete = true;
    try { await this.isolation?.cleanup(); } catch { /* temporary isolation cleanup is best effort */ }
  }
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function asObjectValue(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isRpcId(value: unknown): value is RpcId {
  return typeof value === 'number' || typeof value === 'string';
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function requiredString(value: unknown, message: string): string {
  const result = optionalString(value);
  if (!result) throw new Error(message);
  return result;
}

function safeErrorMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/(?:[A-Za-z]:\\|\/)[^\s'"`]+/g, '<path>')
    .slice(0, 240);
}

function safeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeValue);
  if (!value || typeof value !== 'object') return value;
  const result: JsonObject = {};
  for (const [key, child] of Object.entries(value as JsonObject)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if ((key === 'message' || key === 'error') && typeof child === 'string') {
      result[key] = safeErrorMessage(child);
    } else {
      result[key] = safeValue(child);
    }
  }
  return result;
}

function safeObject(value: unknown): Record<string, unknown> {
  const result = safeValue(value);
  return asObject(result);
}

function extractFinalText(turn: JsonObject): string | undefined {
  const items = Array.isArray(turn.items) ? turn.items : [];
  let fallback: string | undefined;
  for (const raw of items) {
    const item = asObject(raw);
    if (item.type !== 'agentMessage' || typeof item.text !== 'string') continue;
    fallback = item.text;
    if (item.phase === 'final_answer') return item.text;
  }
  return fallback;
}

function catalogProjection(catalog: unknown, model: string): Record<string, unknown> {
  const root = asObject(catalog);
  const models = Array.isArray(root.models) ? root.models : [];
  const entry = models.map(asObject).find(value => value.slug === model) ?? {};
  const fields = [
    'slug', 'display_name', 'supported_reasoning_levels', 'default_reasoning_level',
    'shell_type', 'apply_patch_tool_type', 'experimental_supported_tools',
    'supports_search_tool', 'use_responses_lite', 'tool_mode', 'node_repl_disabled',
    'include_skills_usage_instructions', 'include_plugin_usage_instructions',
    'include_apps_usage_instructions',
  ];
  return Object.fromEntries(fields.filter(field => field in entry).map(field => [field, safeValue(entry[field])]));
}

function catalogModelEntry(catalog: unknown, model: string): JsonObject {
  const root = asObject(catalog);
  const models = Array.isArray(root.models) ? root.models : [];
  return models.map(asObject).find(value => value.slug === model) ?? {};
}

function supportedEffortsFrom(entry: JsonObject, verification: Record<string, unknown>): string[] {
  const values = Array.isArray(entry.supported_reasoning_levels)
    ? entry.supported_reasoning_levels
    : Array.isArray(verification.supportedReasoningLevels) ? verification.supportedReasoningLevels : [];
  return values.flatMap(value => {
    if (typeof value === 'string') return [value];
    return [optionalString(asObject(value).effort)].filter((effort): effort is string => Boolean(effort));
  });
}

function numericProjection(value: JsonObject, keys: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key of keys) {
    if (typeof value[key] === 'number' && Number.isFinite(value[key])) result[key] = value[key] as number;
  }
  return result;
}

function safeFlatConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' || value === null) {
      result[key] = value;
    }
  }
  return result;
}
