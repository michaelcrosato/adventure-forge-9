export const PLAYER_INSTRUCTION = `You are playing this game for the first time. Use only what the game shows you. Choose naturally. You may stop through the game's exit action. After play, describe your own experience honestly.
During gameplay, you receive observations with available choices. Reply with JSON: {"choiceId":"the choice ID"}. To leave, use {"choiceId":"__end__"}. You do not need to copy session IDs or revisions. After gameplay, answer the interview questions in the format requested for each interview turn.`;

export const FREE_INTERVIEW = `The game is now closed. Gameplay actions are disabled. Describe your own experience honestly in your own words:
1. What did you think you were trying to do?
2. Which choice mattered most to you, and why?
3. Where were you confused or unable to proceed?
4. What was the best moment?
5. What was the worst moment?
6. Would you choose to continue or start another run? Why?`;

export const STRUCTURED_INTERVIEW = `Now summarize your own experience as JSON. Rate clarity and enjoyment from 1 (very poor) to 5 (excellent). Use this shape:
{"clarity":1,"enjoyment":1,"confusion":["any confusing moments"],"observedDefects":["any defects you observed"],"playAgain":false,"reason":"why"}.
Empty arrays are welcome when you observed none. Do not change your judgments to fit any expected result.`;

export const CHOICE_SCHEMA = {
  type: 'object', properties: { choiceId: { type: 'string' } }, required: ['choiceId'], additionalProperties: false,
};

export const INTERVIEW_SCHEMA = {
  type: 'object', properties: {
    clarity: { type: 'integer', minimum: 1, maximum: 5 },
    enjoyment: { type: 'integer', minimum: 1, maximum: 5 },
    confusion: { type: 'array', items: { type: 'string' } },
    observedDefects: { type: 'array', items: { type: 'string' } },
    playAgain: { type: 'boolean' }, reason: { type: 'string' },
  }, required: ['clarity', 'enjoyment', 'confusion', 'observedDefects', 'playAgain', 'reason'], additionalProperties: false,
};

export function parseInterview(text: string) {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object') throw new Error('Interview must be an object');
  const record = value as Record<string, unknown>;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
  if (!Number.isInteger(record.clarity) || Number(record.clarity) < 1 || Number(record.clarity) > 5
    || !Number.isInteger(record.enjoyment) || Number(record.enjoyment) < 1 || Number(record.enjoyment) > 5
    || !strings(record.confusion) || !strings(record.observedDefects)
    || typeof record.playAgain !== 'boolean' || typeof record.reason !== 'string') throw new Error('Malformed interview fields');
  return record;
}
