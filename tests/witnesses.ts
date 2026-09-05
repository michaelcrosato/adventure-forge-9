import { choose, start } from '../src/engine/index.js';

export const RESOLUTION_WITNESSES = {
  share: ['visit-clinic', 'make-clinic-promise', 'refuse-council-control', 'borrow-repair-tools', 'follow-canal', 'read-stolen-order', 'repair-and-share-water', 'release-shared-water', 'bring-shared-water-to-clinic', 'deliver-clinic-medicine'],
  council: ['hear-council', 'take-council-seal', 'borrow-repair-tools', 'follow-canal', 'read-stolen-order', 'give-red-sluice-to-council', 'release-council-water', 'report-council-rationing', 'sign-council-charter'],
  evacuate: ['find-nessa', 'work-without-tools', 'pay-scouts', 'force-sluice-gate', 'open-evacuation-route', 'signal-evacuation', 'organize-high-ground-evacuation', 'lead-evacuation'],
} as const;

export function walk(ids: readonly string[], seed = 1) {
  return ids.reduce((state, id) => choose(state, id, state.revision), start(seed));
}
