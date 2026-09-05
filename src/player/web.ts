export const PAGE_HTML = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b131c" />
    <title>The Split Tide · Adventure Forge</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>
    <div class="app-shell">
      <header class="masthead">
        <div class="brand-lockup">
          <p class="kicker">ADVENTURE FORGE 09 <span>/</span> FIELD LOG</p>
          <h1>The Split Tide</h1>
          <p class="dek">Water, work, and promises in the towns of Veyra Basin.</p>
        </div>
        <div class="session-status" aria-live="polite">
          <span id="status-dot" class="status-dot"></span>
          <span id="status-label">Preparing an expedition</span>
        </div>
      </header>

      <main class="page-grid">
        <section class="story-card panel" aria-labelledby="scene-title">
          <div class="scene-bar">
            <span class="scene-label" id="scene-id">FIELD LOG</span>
            <span class="scene-rule"></span>
            <span class="scene-label" id="scene-status">LIVE</span>
          </div>
          <h2 id="scene-title">The town is waiting.</h2>
          <div id="story-text" class="story-text">
            <p>Loading the next expedition…</p>
          </div>
          <div id="receipt" class="receipt" hidden>
            <p class="eyebrow">Ending recorded</p>
            <p id="receipt-summary"></p>
          </div>
          <details id="facts" class="facts" hidden>
            <summary>
              <span class="eyebrow">What you know</span>
              <span id="facts-count" class="muted"></span>
            </summary>
            <ul id="facts-list"></ul>
          </details>
          <div class="choice-heading">
            <p class="eyebrow">Choose your path</p>
            <span id="choice-count" class="muted">—</span>
          </div>
          <div id="choices" class="choices" aria-live="polite"></div>
          <div class="story-footer">
            <button id="leave-button" class="text-button" type="button">End journey</button>
            <p id="notice" class="notice" role="status" aria-live="polite"></p>
          </div>
        </section>

        <aside class="side-column">
          <section class="panel resources-panel" aria-labelledby="resources-title">
            <div class="panel-heading">
              <p class="eyebrow">At hand</p>
              <h2 id="resources-title">Resources</h2>
            </div>
            <div id="resources" class="resources-grid"></div>
          </section>

          <section class="panel log-panel" aria-labelledby="log-title">
            <div class="panel-heading panel-heading-row">
              <div>
                <p class="eyebrow">Along the road</p>
                <h2 id="log-title">Journey log</h2>
              </div>
              <div class="log-actions">
                <span id="log-count" class="log-count">0</span>
                <button id="log-toggle" class="text-button log-toggle" type="button" hidden>Show all</button>
              </div>
            </div>
            <ol id="journey-log" class="journey-log">
              <li class="log-empty">Your decisions will leave a trace here.</li>
            </ol>
          </section>

          <section class="panel tools-panel" aria-labelledby="tools-title">
            <div class="panel-heading">
              <p class="eyebrow">Keep the thread</p>
              <h2 id="tools-title">Journey tools</h2>
            </div>
            <div class="tool-grid">
              <button id="new-button" class="tool-button primary" type="button">New journey</button>
              <button id="load-button" class="tool-button" type="button">Load save</button>
              <button id="save-button" class="tool-button" type="button">Save journey</button>
              <button id="export-button" class="tool-button" type="button">Export ending</button>
            </div>
            <input id="load-input" type="file" accept=".save,.json,application/json,text/plain" hidden />
            <p class="tool-caption">Progress saves automatically in this browser. Download a save to keep a separate copy.</p>
          </section>
        </aside>
      </main>

      <footer class="site-footer">
        <span>Your progress stays in this browser</span>
        <span>Veyra Basin</span>
      </footer>
    </div>
    <script src="/app.js"></script>
  </body>
</html>`;

export const STYLES_CSS = String.raw`:root {
  color-scheme: dark;
  --ink: #0b131c;
  --ink-raised: #111e29;
  --ink-soft: #172735;
  --line: rgba(181, 210, 215, 0.16);
  --line-strong: rgba(181, 210, 215, 0.3);
  --paper: #e4ece8;
  --muted: #90a5a9;
  --teal: #8ed0c2;
  --teal-strong: #61b8aa;
  --rust: #e39a6e;
  --danger: #e18478;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
  font-synthesis: none;
}

* { box-sizing: border-box; }

html, body { min-height: 100%; }

body {
  margin: 0;
  background:
    radial-gradient(circle at 18% 0%, rgba(35, 82, 88, 0.25), transparent 36rem),
    linear-gradient(145deg, #0a121b 0%, #0d1821 54%, #0c151c 100%);
  color: var(--paper);
  letter-spacing: 0.01em;
}

button { font: inherit; }

.ambient {
  position: fixed;
  z-index: 0;
  width: 28rem;
  height: 28rem;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(70px);
  opacity: 0.15;
}

.ambient-one { top: 28%; right: -14rem; background: var(--teal-strong); }
.ambient-two { bottom: -18rem; left: -12rem; background: #9d543d; }

.app-shell { position: relative; z-index: 1; width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 28px 0 24px; }

.masthead { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; padding: 0 4px 22px; border-bottom: 1px solid var(--line); }

.kicker, .eyebrow { margin: 0; color: var(--teal); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.16em; line-height: 1.4; text-transform: uppercase; }
.kicker span { color: var(--muted); margin: 0 0.4em; }
h1, h2, p { margin-top: 0; }
h1, h2 { font-family: Georgia, "Times New Roman", serif; font-weight: 400; letter-spacing: -0.035em; }
h1 { margin: 9px 0 6px; color: #f0f4ef; font-size: clamp(2.05rem, 4vw, 3.45rem); line-height: 0.96; }
h2 { margin-bottom: 0; color: #eff4ee; font-size: clamp(1.55rem, 2.6vw, 2.25rem); line-height: 1.08; }
.dek { max-width: 33rem; margin-bottom: 0; color: var(--muted); font-size: 0.96rem; line-height: 1.6; }

.session-status { display: flex; align-items: center; gap: 9px; padding-bottom: 5px; color: var(--muted); font-size: 0.73rem; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 5px rgba(142, 208, 194, 0.12); }
.status-dot.ended { background: var(--rust); box-shadow: 0 0 0 5px rgba(227, 154, 110, 0.12); }
 

.page-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.72fr); gap: 20px; padding-top: 14px; }
.panel { background: linear-gradient(145deg, rgba(22, 39, 52, 0.95), rgba(14, 27, 37, 0.96)); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2); }
.story-card { min-height: 0; padding: clamp(22px, 3.2vw, 34px); display: flex; flex-direction: column; }
.scene-bar { display: flex; align-items: center; gap: 12px; color: var(--muted); }
.scene-label { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
.scene-rule { width: 34px; height: 1px; background: var(--rust); }
.story-card h2 { max-width: 720px; margin: 18px 0 14px; font-size: clamp(1.8rem, 3.4vw, 2.8rem); line-height: 1.04; }
.story-text { max-width: 680px; color: #bdcbc8; font-family: Georgia, "Times New Roman", serif; font-size: 1rem; line-height: 1.52; }
.story-text p { margin: 0 0 1em; }
.story-text p:last-child { margin-bottom: 0; }
.receipt { margin-top: 18px; padding: 14px 16px; border: 1px solid rgba(227, 154, 110, 0.3); border-radius: 9px; background: rgba(86, 47, 34, 0.18); }
.receipt .eyebrow { color: var(--rust); }
.receipt p:last-child { margin: 7px 0 0; color: #d6dfd8; font-family: Georgia, "Times New Roman", serif; font-size: 0.98rem; line-height: 1.5; }
.facts { margin-top: 18px; padding: 13px 16px; border-left: 2px solid var(--rust); background: rgba(8, 18, 26, 0.34); }
.facts summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; list-style: none; }
.facts summary::-webkit-details-marker { display: none; }
.facts summary::after { color: var(--rust); content: "+"; font-size: 1.05rem; line-height: 1; }
.facts[open] summary::after { content: "−"; }
.facts summary:focus-visible { outline: 1px solid var(--teal-strong); outline-offset: 4px; }
.facts .eyebrow { color: var(--rust); }
.facts ul { margin: 7px 0 0; padding-left: 18px; color: #b7c8c5; font-size: 0.82rem; line-height: 1.45; }
.choice-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 24px; padding-top: 0; }
.muted { color: var(--muted); font-size: 0.76rem; }
.choices { display: grid; gap: 10px; margin-top: 15px; }
.choice { position: relative; display: grid; grid-template-columns: 30px 1fr; gap: 11px; width: 100%; padding: 12px 14px 11px; color: var(--paper); text-align: left; background: rgba(8, 18, 26, 0.4); border: 1px solid var(--line); border-radius: 11px; cursor: pointer; transition: border-color 150ms ease, background 150ms ease, transform 150ms ease; }
.choice:hover, .choice:focus-visible { background: rgba(33, 61, 70, 0.65); border-color: var(--teal-strong); outline: none; transform: translateY(-1px); }
.choice:disabled { cursor: not-allowed; opacity: 0.5; transform: none; }
.choice-number { color: var(--rust); font-family: Georgia, serif; font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.choice-label { display: block; margin-bottom: 5px; font-size: 0.96rem; font-weight: 650; }
.choice-description { display: block; color: var(--muted); font-size: 0.82rem; line-height: 1.45; }
.story-footer { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-top: 22px; }
.text-button { padding: 0; color: var(--muted); background: none; border: 0; font-size: 0.79rem; cursor: pointer; }
.text-button:hover, .text-button:focus-visible { color: var(--paper); outline: none; }
.notice { min-height: 1.4em; margin: 0; color: var(--rust); font-size: 0.78rem; text-align: right; }
.notice.success { color: var(--teal); }
.notice.error { color: var(--danger); }

.side-column { display: grid; align-content: start; gap: 20px; }
.resources-panel, .log-panel, .tools-panel { padding: 25px; }
.panel-heading { margin-bottom: 20px; }
.panel-heading h2 { margin-top: 7px; font-size: 1.7rem; }
.panel-heading-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.log-actions { display: flex; align-items: center; gap: 10px; }
.log-count { min-width: 28px; padding: 5px 8px; color: var(--teal); font-size: 0.75rem; text-align: center; border: 1px solid rgba(142, 208, 194, 0.3); border-radius: 999px; }
.log-toggle { font-size: 0.7rem; white-space: nowrap; }
.resources-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.resource { padding: 12px 13px; background: rgba(6, 15, 22, 0.34); border: 1px solid var(--line); border-radius: 9px; }
.resource-name { display: block; overflow: hidden; color: var(--muted); font-size: 0.67rem; letter-spacing: 0.08em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.resource-value { display: block; margin-top: 5px; color: var(--paper); font-family: Georgia, serif; font-size: 1.25rem; }
.journey-log { max-height: 240px; overflow: auto; margin: 0; padding: 0 0 0 24px; color: var(--muted); font-size: 0.79rem; line-height: 1.55; }
.journey-log li { padding: 0 0 14px 3px; }
.journey-log li::marker { color: var(--rust); font-size: 0.74rem; }
.journey-log li strong { display: block; color: #cad8d5; font-weight: 600; }
.journey-log .log-empty { margin-left: -24px; padding: 0; color: #607980; list-style: none; }
.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .tool-button { min-height: 42px; padding: 9px 11px; color: #c7d8d4; background: rgba(7, 16, 23, 0.34); border: 1px solid var(--line); border-radius: 8px; cursor: pointer; font-size: 0.78rem; transition: border-color 150ms ease, color 150ms ease, background 150ms ease; }
  .tool-button:disabled { cursor: not-allowed; opacity: 0.42; }
.tool-button:hover, .tool-button:focus-visible { color: var(--paper); background: rgba(34, 61, 69, 0.6); border-color: var(--line-strong); outline: none; }
.tool-button.primary { color: var(--ink); background: var(--teal); border-color: var(--teal); font-weight: 700; }
.tool-button.primary:hover, .tool-button.primary:focus-visible { background: #afe0d4; border-color: #afe0d4; }
.tool-caption { margin: 16px 0 0; color: #647d82; font-size: 0.7rem; line-height: 1.5; }
.site-footer { display: flex; justify-content: space-between; gap: 15px; padding: 19px 4px 0; color: #60777c; font-size: 0.69rem; letter-spacing: 0.04em; }
code { color: #8ea9a9; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

@media (max-width: 820px) {
  .app-shell { width: min(100% - 26px, 680px); padding-top: 24px; }
  .masthead { align-items: flex-start; flex-direction: column; gap: 20px; padding-bottom: 25px; }
  .session-status { padding-bottom: 0; }
  .page-grid { grid-template-columns: 1fr; }
  .story-card { min-height: 0; }
  .choice-heading { margin-top: 24px; }
  .side-column { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
  .tools-panel { grid-column: 1 / -1; }
}

@media (max-width: 500px) {
  .app-shell { width: min(100% - 20px, 680px); }
  .story-card { padding: 24px 20px; }
  .resources-panel, .log-panel, .tools-panel { padding: 20px; }
  .side-column { display: grid; grid-template-columns: 1fr; }
  .tools-panel { grid-column: auto; }
  .story-footer, .site-footer { align-items: flex-start; flex-direction: column; }
  .notice { text-align: left; }
}
`;

export const APP_JS = String.raw`(() => {
  'use strict';

  const SESSION_STORAGE_KEY = 'adventure-forge-session';
  const CHECKPOINT_STORAGE_KEY = 'adventure-forge-checkpoint';
  const RECENT_LOG_LIMIT = 5;
  let sessionId = null;
  let checkpoint = null;
  let observation = null;
  let journal = [];
  let logExpanded = false;
  let busy = false;
  let nextSeed = 1;
  let storageUnavailable = false;

  const byId = (id) => document.getElementById(id);
  const statusDot = byId('status-dot');
  const statusLabel = byId('status-label');
  const sceneStatus = byId('scene-status');
  const sceneTitle = byId('scene-title');
  const storyText = byId('story-text');
  const receipt = byId('receipt');
  const receiptSummary = byId('receipt-summary');
  const facts = byId('facts');
  const factsCount = byId('facts-count');
  const factsList = byId('facts-list');
  const choices = byId('choices');
  const choiceCount = byId('choice-count');
  const resources = byId('resources');
  const journeyLog = byId('journey-log');
  const logCount = byId('log-count');
  const logToggle = byId('log-toggle');
  const notice = byId('notice');
  const leaveButton = byId('leave-button');
  const newButton = byId('new-button');
  const loadButton = byId('load-button');
  const saveButton = byId('save-button');
  const exportButton = byId('export-button');
  const loadInput = byId('load-input');

  function showNotice(message, kind) {
    notice.textContent = (message || '') + (storageUnavailable ? ' Browser storage is unavailable; download a save before closing this page.' : '');
    notice.className = 'notice' + (kind ? ' ' + kind : '');
  }

  function resourceLabel(name) {
    return name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function setTextList(node, values, className) {
    node.replaceChildren();
    values.forEach((value) => {
      const element = document.createElement('p');
      if (className) element.className = className;
      element.textContent = value;
      node.append(element);
    });
  }

  function rememberSession(id) {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    } catch (_) {
      // Storage can be disabled by the browser; the live session still works.
    }
  }

  function rememberedSession() {
    try {
      const value = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return value && value.length <= 128 ? value : null;
    } catch (_) {
      return null;
    }
  }

  function forgetSession() {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (_) {
      // Storage can be disabled by the browser.
    }
  }

  function rememberCheckpoint(payload) {
    if (typeof payload.checkpoint !== 'string' || typeof payload.sessionId !== 'string') return;
    checkpoint = payload.checkpoint;
    sessionId = payload.sessionId;
    rememberSession(sessionId);
    try {
      localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify({ sessionId, checkpoint }));
      storageUnavailable = false;
    } catch (_) {
      storageUnavailable = true;
      showNotice('Browser storage is unavailable. Download a save before closing this page.', 'error');
    }
  }

  function storedCheckpoint() {
    try {
      const value = JSON.parse(localStorage.getItem(CHECKPOINT_STORAGE_KEY) || 'null');
      return value && typeof value.sessionId === 'string' && value.sessionId.length <= 128
        && typeof value.checkpoint === 'string' ? value : null;
    } catch (_) { return null; }
  }

  function publicJournal(values) {
    if (!Array.isArray(values)) return [];
    return values.filter((entry) => entry && typeof entry.choice === 'string'
      && typeof entry.from === 'string' && typeof entry.to === 'string')
      .map((entry) => ({ choice: entry.choice, from: entry.from, to: entry.to }));
  }

  function journalDetail(entry) {
    return entry.from === entry.to
      ? 'At ' + entry.to
      : entry.from + ' → ' + entry.to;
  }

  function renderResources(values) {
    resources.replaceChildren();
    const entries = Object.entries(values || {});
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'Nothing carried yet.';
      resources.append(empty);
      return;
    }
    entries.forEach(([name, value]) => {
      const item = document.createElement('div');
      item.className = 'resource';
      const label = document.createElement('span');
      label.className = 'resource-name';
      label.textContent = resourceLabel(name);
      const amount = document.createElement('span');
      amount.className = 'resource-value';
      amount.textContent = String(value);
      item.append(label, amount);
      resources.append(item);
    });
  }

  function renderLog() {
    journeyLog.replaceChildren();
    journeyLog.reversed = true;
    journeyLog.start = journal.length;
    logCount.textContent = String(journal.length);
    logCount.setAttribute('aria-label', journal.length + (journal.length === 1 ? ' decision' : ' decisions'));
    logToggle.hidden = journal.length <= RECENT_LOG_LIMIT;
    logToggle.textContent = logExpanded ? 'Show recent' : 'Show all (' + journal.length + ')';
    logToggle.setAttribute('aria-expanded', String(logExpanded));
    if (journal.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'log-empty';
      empty.textContent = 'Your decisions will leave a trace here.';
      journeyLog.append(empty);
      return;
    }
    const entries = (logExpanded ? journal : journal.slice(-RECENT_LOG_LIMIT)).slice().reverse();
    entries.forEach((entry) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = entry.choice;
      const detail = document.createElement('span');
      detail.textContent = journalDetail(entry);
      item.append(title, detail);
      journeyLog.append(item);
    });
    journeyLog.scrollTop = 0;
  }

  function render(nextObservation) {
    const previousObservation = observation;
    observation = nextObservation;
    journal = publicJournal(observation.journal);
    renderLog();
    const ended = observation.status !== 'playing';
    const status = observation.status.charAt(0).toUpperCase() + observation.status.slice(1);
    statusLabel.textContent = status;
    sceneStatus.textContent = ended ? status.toUpperCase() : 'LIVE';
    sceneTitle.textContent = observation.title;
    setTextList(storyText, observation.text || []);
    if (observation.receipt) {
      receiptSummary.textContent = observation.receipt.summary;
      receipt.hidden = false;
    } else {
      receipt.hidden = true;
      receiptSummary.textContent = '';
    }

    factsList.replaceChildren();
    (observation.facts || []).forEach((fact) => {
      const item = document.createElement('li');
      item.textContent = fact;
      factsList.append(item);
    });
    factsCount.textContent = (observation.facts || []).length + ((observation.facts || []).length === 1 ? ' fact' : ' facts');
    facts.hidden = !(observation.facts && observation.facts.length);
    if (!previousObservation || previousObservation.revision !== observation.revision) facts.open = false;

    choices.replaceChildren();
    const availableChoices = observation.choices || [];
    choiceCount.textContent = ended ? 'Journey closed' : availableChoices.length + (availableChoices.length === 1 ? ' path' : ' paths');
    availableChoices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.type = 'button';
      button.disabled = busy || ended;
      button.dataset.choiceId = choice.id;
      const number = document.createElement('span');
      number.className = 'choice-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const copy = document.createElement('span');
      const label = document.createElement('span');
      label.className = 'choice-label';
      label.textContent = choice.label;
      const description = document.createElement('span');
      description.className = 'choice-description';
      description.textContent = choice.description;
      copy.append(label, description);
      button.append(number, copy);
      button.addEventListener('click', () => choose(choice.id));
      choices.append(button);
    });

    renderResources(observation.resources);
    statusDot.classList.toggle('ended', ended);
    leaveButton.disabled = busy || ended;
    exportButton.disabled = busy || !observation.receipt;
    if (previousObservation && previousObservation.revision !== observation.revision) {
      sceneTitle.tabIndex = -1;
      sceneTitle.focus({ preventScroll: true });
      sceneTitle.scrollIntoView({ block: 'start' });
    }
  }

  function setBusy(value) {
    busy = value;
    if (observation) render(observation);
  }

  async function request(path, options) {
    const response = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, options || {}));
    let payload = null;
    try { payload = await response.json(); } catch (_) { payload = {}; }
    rememberCheckpoint(payload);
    if (!response.ok) {
      const error = new Error((payload.error && payload.error.message) || 'The journey could not complete that request.');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function jsonBody(value) { return JSON.stringify(value); }

  async function newJourney() {
    setBusy(true);
    try {
      const payload = await request('/api/start', { method: 'POST', body: jsonBody({ seed: nextSeed++ }) });
      sessionId = payload.sessionId;
      rememberSession(sessionId);
      logExpanded = false;
      facts.open = false;
      render(payload.observation);
      showNotice('A fresh journey begins.', 'success');
    } catch (error) {
      showNotice(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!sessionId) return newJourney();
    try {
      const payload = await request('/api/observe', { method: 'POST', body: jsonBody({ sessionId, checkpoint }) });
      render(payload.observation);
    } catch (error) {
      showNotice(error.message, 'error');
    }
  }

  async function choose(id) {
    if (!observation || observation.status !== 'playing' || busy) return;
    const previous = observation;
    setBusy(true);
    try {
      const payload = await request('/api/choose', { method: 'POST', body: jsonBody({ sessionId, checkpoint, id, expectedRevision: previous.revision }) });
      render(payload.observation);
      showNotice(payload.observation.status === 'playing' ? 'The path responds.' : 'The journey has reached its ending.', 'success');
    } catch (error) {
      if (error.status === 409 && error.payload && error.payload.observation) {
        render(error.payload.observation);
        showNotice('This view was out of date. Your log has been refreshed.', 'error');
      } else {
        showNotice(error.message, 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!observation || observation.status !== 'playing' || busy) return;
    setBusy(true);
    try {
      const payload = await request('/api/end', { method: 'POST', body: jsonBody({ sessionId, checkpoint, expectedRevision: observation.revision }) });
      render(payload.observation);
      showNotice('Your ending has been recorded.', 'success');
    } catch (error) {
      if (error.status === 409 && error.payload && error.payload.observation) {
        render(error.payload.observation);
        showNotice('This view was out of date. Your log has been refreshed.', 'error');
      } else {
        showNotice(error.message, 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function saveJourney() {
    if (busy) return;
    if (checkpoint) {
      download('the-split-tide.save', checkpoint, 'application/octet-stream');
      showNotice('Your saved journey was downloaded.', 'success');
      return;
    }
    if (!sessionId) return;
    setBusy(true);
    try {
      const payload = await request('/api/save', { method: 'POST', body: jsonBody({ sessionId }) });
      download('the-split-tide.save', payload.serialized, 'application/octet-stream');
      showNotice('Saved at ' + (observation ? observation.title : 'your current place') + '.', 'success');
    } catch (error) {
      showNotice(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function exportEnding() {
    if (!observation) return;
    const lines = ['THE SPLIT TIDE', '', observation.title, '', ...(observation.text || [])];
    if (journal.length) {
      lines.push('', 'JOURNEY LOG', ...journal.map((entry) => '- ' + entry.choice + ': ' + journalDetail(entry)));
    }
    if (observation.receipt) lines.push('', 'ENDING', observation.receipt.summary);
    download('the-split-tide-ending.txt', lines.join('\n'), 'text/plain;charset=utf-8');
    showNotice('Visible ending exported.', 'success');
  }

  function startLoad() { loadInput.click(); }

  async function loadJourney(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const serialized = await file.text();
      const payload = await request('/api/restore', { method: 'POST', body: jsonBody({ serialized }) });
      sessionId = payload.sessionId;
      rememberSession(sessionId);
      logExpanded = false;
      facts.open = false;
      render(payload.observation);
      showNotice('Loaded ' + payload.observation.title + '.', 'success');
    } catch (error) {
      showNotice('Load refused: ' + error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  newButton.addEventListener('click', newJourney);
  loadButton.addEventListener('click', startLoad);
  loadInput.addEventListener('change', loadJourney);
  saveButton.addEventListener('click', saveJourney);
  exportButton.addEventListener('click', exportEnding);
  leaveButton.addEventListener('click', leave);
  logToggle.addEventListener('click', () => {
    logExpanded = !logExpanded;
    renderLog();
  });

  async function restoreSession() {
    const stored = storedCheckpoint();
    const savedSession = stored ? stored.sessionId : rememberedSession();
    if (!savedSession) return newJourney();
    sessionId = savedSession;
    checkpoint = stored ? stored.checkpoint : null;
    setBusy(true);
    try {
      const payload = await request('/api/observe', { method: 'POST', body: jsonBody({ sessionId, checkpoint }) });
      render(payload.observation);
      showNotice('Resumed ' + payload.observation.title + '.', 'success');
    } catch (error) {
      if (error.status === 404 && !checkpoint) {
        forgetSession();
        sessionId = null;
        await newJourney();
      } else {
        sceneTitle.textContent = 'Your saved journey is safe.';
        setTextList(storyText, ['This journey could not be resumed. A game update may require a new journey. Download your previous save before starting again, or reload to retry.']);
        statusLabel.textContent = 'Save available';
        leaveButton.disabled = true;
        exportButton.disabled = true;
        showNotice('Use Save journey to keep the previous file, or New journey to begin again.', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  restoreSession().catch((error) => {
    showNotice(error.message || 'Unable to start the journey.', 'error');
  });
})();`;
