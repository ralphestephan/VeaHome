import { fetch } from 'undici';

const NODE_RED_WEBHOOK_URL = process.env.NODE_RED_WEBHOOK_URL;
const NODE_RED_WEBHOOK_SECRET = process.env.NODE_RED_WEBHOOK_SECRET;

export interface FlowTriggerPayload {
  flow: string;
  data: Record<string, unknown>;
}

export async function triggerNodeRedFlow(payload: FlowTriggerPayload) {
  if (!NODE_RED_WEBHOOK_URL) {
    console.warn('[node-red] Missing NODE_RED_WEBHOOK_URL, skipping trigger');
    return;
  }

  await fetch(NODE_RED_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-node-red-secret': NODE_RED_WEBHOOK_SECRET || '',
    },
    body: JSON.stringify(payload),
  });
}
