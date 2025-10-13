import { getCloudflareContext } from '@opennextjs/cloudflare';
import { MessageWithTurnId } from '../api/agent/route';

export const inMemoryConversations = {} as Record<string, MessageWithTurnId[]>;

export const conversationKey = (conversationId: string) => `conversation:${conversationId}`;

export const loadConversation = async (kv: KVNamespace, conversationId: string) => {
  const existing = await kv.get<MessageWithTurnId[]>(conversationKey(conversationId), { type: 'json' });

  return existing ?? [];
};

export const persistConversation = (kv: KVNamespace, conversationId: string, messages: MessageWithTurnId[]) => {
  console.log(`Persisting conversation ${conversationId} with ${messages.length} messages.`);
  console.log(JSON.stringify(messages, null, 2));
  kv.put(conversationKey(conversationId), JSON.stringify(messages));
};

export const getConversationStore = () => {
  try {
    const { env } = getCloudflareContext();
    const kv = env.MESSAGES_KV;
    if (!kv) throw new Error('MESSAGES_KV binding is not configured.');
    console.log('Using MESSAGE_KV for conversation storage.');
    return {
      load: (conversationId: string) => loadConversation(kv, conversationId),
      persist: (conversationId: string, messages: MessageWithTurnId[]) => persistConversation(kv, conversationId, messages)
    };
  } catch (error) {
    if (process.env.NEXTJS_ENV === 'production') throw error;
    console.warn(
      'MESSAGES_KV binding unavailable in this environment – falling back to in-memory storage. Data will reset on restart. Run `npx wrangler kv namespace create MESSAGES_KV` to create the KV namespace for conversation storage.'
    );
    return {
      load: async (conversationId: string) => inMemoryConversations[conversationId] ?? [],
      persist: async (conversationId: string, messages: MessageWithTurnId[]) => {
        inMemoryConversations[conversationId] = messages;
      }
    };
  }
};
