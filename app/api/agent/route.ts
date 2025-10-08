export const dynamic = 'force-dynamic';

import { createOpenAI } from '@ai-sdk/openai';
import { streamText, ModelMessage, tool, stepCountIs, experimental_createMCPClient } from 'ai';
import z from 'zod';
import { streamResponse, verifySignature } from '@layercode/node-server-sdk';
import { prettyPrintMsgs } from '@/app/utils/msgs';
import config from '@/layercode.config.json';

import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export type MessageWithTurnId = ModelMessage & { turn_id: string };
type WebhookRequest = {
  conversation_id: string;
  text: string;
  turn_id: string;
  interruption_context?: {
    previous_turn_interrupted: boolean;
    words_heard: number;
    text_heard: string;
    assistant_turn_id?: string;
  };
  type: 'message' | 'session.start' | 'session.update' | 'session.end';
};

const SYSTEM_PROMPT = config.prompt;
const WELCOME_MESSAGE = config.welcome_message;

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// In production we recommend fast datastore like Redis or Cloudflare D1 for storing conversation history
// Here we use a simple in-memory object for demo purposes
const conversations = {} as Record<string, MessageWithTurnId[]>;

export const POST = async (request: Request) => {
  const requestBody = (await request.json()) as WebhookRequest;
  console.log('Webhook received from Layercode', requestBody);

  // Verify this webhook request is from Layercode
  const signature = request.headers.get('layercode-signature') || '';
  const secret = process.env.LAYERCODE_WEBHOOK_SECRET || '';
  const isValid = verifySignature({
    payload: JSON.stringify(requestBody),
    signature,
    secret
  });
  if (!isValid) return new Response('Invalid layercode-signature', { status: 401 });

  const { conversation_id, text: userText, turn_id, type, interruption_context } = requestBody;

  // If this is a new conversation, create a new array to hold messages
  if (!conversations[conversation_id]) {
    conversations[conversation_id] = [];
  }

  // Immediately store the user message received
  conversations[conversation_id].push({ role: 'user', turn_id, content: userText });

  switch (type) {
    case 'session.start':
      // A new session/call has started. If you want to send a welcome message (have the agent speak first), return that here.
      return streamResponse(requestBody, async ({ stream }) => {
        // Save the welcome message to the conversation history
        conversations[conversation_id].push({ role: 'assistant', turn_id, content: WELCOME_MESSAGE });
        // Send the welcome message to be spoken
        stream.tts(WELCOME_MESSAGE);
        stream.end();
      });
    case 'message':
      // The user has spoken and the transcript has been received. Call our LLM and genereate a response.

      // Before generating a response, we store a placeholder assistant msg in the history. This is so that if the agent response is interrupted (which is common for voice agents), before we have the chance to save our agent's response, our conversation history will still follow the correct user-assistant turn order.
      const assistantResposneIdx = conversations[conversation_id].push({ role: 'assistant', turn_id, content: '' });
      return streamResponse(requestBody, async ({ stream }) => {
        let docsTools = {};
        let docsMCP: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null;
        try {
          const docsTransport = new StreamableHTTPClientTransport(new URL('https://docs.layercode.com/mcp'));
          docsMCP = await experimental_createMCPClient({
            transport: docsTransport
          });
          docsTools = await docsMCP.tools();
        } catch (error) {
          console.log('Docs MCP unavailable, continuing without docs tools', error);
        }

        const weather = tool({
          description: 'Get the weather in a location',
          inputSchema: z.object({
            location: z.string().describe('The location to get the weather for')
          }),
          execute: async ({ location }) => {
            stream.data({ isThinking: true });
            // do something to get the weather
            stream.data({ isThinking: false });

            return {
              location,
              temperature: 72 + Math.floor(Math.random() * 21) - 10
            };
          }
        });
        try {
          const { textStream } = streamText({
            model: openai('gpt-4o-mini'),
            system: SYSTEM_PROMPT,
            messages: conversations[conversation_id], // The user message has already been added to the conversation array earlier, so the LLM will be responding to that.
            tools: {
              weather,
              ...docsTools
            },
            toolChoice: 'auto',
            stopWhen: stepCountIs(10),
            onFinish: async ({ response }) => {
              // The assistant has finished generating the full response text. Now we update our conversation history with the additional messages generated. For a simple LLM generated single agent response, there will be one additional message. If you add some tools, and allow multi-step agent mode, there could be multiple additional messages which all need to be added to the conversation history.

              // First, we remove the placeholder assistant message we added earlier, as we will be replacing it with the actual generated messages.
              conversations[conversation_id].splice(assistantResposneIdx - 1, 1);

              // Push the new messages returned from the LLM into the conversation history, adding the Layercode turn_id to each message.
              conversations[conversation_id].push(...response.messages.map((m) => ({ ...m, turn_id })));

              console.log('--- final message history ---');
              prettyPrintMsgs(conversations[conversation_id]);

              stream.end(); // Tell Layercode we are done responding
            }
          });
          // Stream the text response as it is generated, and have it spoken in real-time
          await stream.ttsTextStream(textStream);
        } finally {
          if (docsMCP) {
            try {
              await docsMCP.close();
            } catch (closeError) {
              console.log('Failed to close docs MCP client', closeError);
            }
          }
        }
      });
    case 'session.end':
      // The session/call has ended. Here you could store or analyze the conversation transcript (stored in your conversations history)
      return new Response('OK', { status: 200 });
    case 'session.update':
      // The session/call state has been updated. This happens after the session has ended, and when the recording audio file has been processed and is available for download.
      return new Response('OK', { status: 200 });
  }
};
