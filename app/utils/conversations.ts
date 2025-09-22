import type { Draft } from 'immer';

export type ConversationEntry = {
  role: 'user' | 'assistant' | 'data';
  text: string;
  ts: number;
  turnId?: string;
};

export type ConversationStore = Record<string, ConversationEntry[]>;

export type ConversationMessage = {
  role: 'user' | 'assistant';
  turnId?: string;
  text: string;
  replace?: boolean;
};

type UpdateConversationArgs = {
  conversationId: string | null | undefined;
  message: ConversationMessage;
  updateStore: (recipe: (draft: Draft<ConversationStore>) => void) => void;
  timestamp?: number;
};

/**
 * Append streaming transcript text to an existing turn or adds a fresh message when
 * no matching turn exists. No-op if the conversation has not been created.
 */
export function updateConversation({ conversationId, message, updateStore, timestamp }: UpdateConversationArgs) {
  if (!conversationId) return;

  const ts = timestamp ?? Date.now();

  updateStore((draft) => {
    const entries = draft[conversationId] ?? (draft[conversationId] = []);

    if (!message.turnId) {
      entries.push({ role: message.role, text: message.text, ts });
      return;
    }

    const existingEntry = findEntry(entries, message.role, message.turnId);

    if (!existingEntry) {
      entries.push({ role: message.role, text: message.text, ts, turnId: message.turnId });
      return;
    }

    existingEntry.text = message.replace ? message.text : joinText(existingEntry.text, message.text);
    existingEntry.ts = ts;
  });
}

function findEntry(entries: ConversationEntry[], role: 'user' | 'assistant', turnId: string) {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry.role === role && entry.turnId === turnId) {
      return entry;
    }
  }
  return undefined;
}

function joinText(existing: string, incoming: string) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  return `${existing} ${incoming}`;
}
