'use client';

// import { useLayercodeAgent } from '@layercode/react-sdk';
import { useLayercodeAgent } from '../external/layercode-react-sdk';
import { useEffect, useRef, useState } from 'react';
import { useImmer } from 'use-immer';
import { updateConversation, type ConversationStore } from '../utils/conversations';
import TranscriptConsole from './TranscriptConsole';
import PromptPane from './PromptPane';
import { HeaderBar } from './HeaderBar';
import SpectrumVisualizer from './SpectrumVisualizer';
import { MicrophoneButton } from './MicrophoneButton';

export default function VoiceAgent() {
  const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID;
  // Transcript and signal state
  const [conversations, updateConversations] = useImmer<ConversationStore>({});
  const [turn, setTurn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const notifyRef = useRef<HTMLAudioElement | null>(null);

  const activeConversation = conversationId ? conversations[conversationId] ?? [] : [];

  useEffect(() => {
    // Prepare notification audio element
    const a = new Audio('/notify1.wav');
    a.preload = 'auto';
    a.volume = 0.8;
    notifyRef.current = a;
    return () => {
      if (notifyRef.current) {
        // best-effort cleanup
        notifyRef.current.pause();
        notifyRef.current.src = '';
        notifyRef.current = null;
      }
    };
  }, []);

  function playNotify() {
    const a = notifyRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }

  const { connect, disconnect, status, userAudioAmplitude, agentAudioAmplitude, mute, unmute, isMuted } = useLayercodeAgent({
    agentId: agentId!,
    authorizeSessionEndpoint: '/api/authorize',
    onConnect(data) {
      setConversationId(data.conversationId);
      updateConversations((draft) => {
        draft[data.conversationId] ??= [];
      });
    },
    onMuteStateChange(isMuted) {
      // if (conversationId) {
      //   updateConversations((draft) => {
      //     const history = draft[conversationId] ?? (draft[conversationId] = []);
      //     history.push({ role: 'data', text: `MIC → ${isMuted ? 'muted' : 'unmuted'}`, ts: Date.now() });
      //   });
      // }
    },
    onMessage: (data: any) => {
      console.log(data);
      switch (data?.type) {
        case 'turn.start': {
          setTurn(data.role);
          if (data.role == 'assistant') {
            playNotify();
          }
          // Optional: log turn change as a data entry for visibility
          // if (conversationId) {
          //   updateConversations((draft) => {
          //     const history = draft[conversationId] ?? (draft[conversationId] = []);
          //     history.push({ role: 'data', text: `TURN → ${data.role}`, ts: Date.now() });
          //   });
          // }
          break;
        }
        case 'vad_events': {
          setUserSpeaking(data.event == 'vad_start');
          break;
        }
        case 'user.transcript.delta': {
          updateConversation({
            conversationId: data.conversation_id,
            message: { role: 'user', turnId: data.turn_id, text: data.content ?? '' },
            updateStore: updateConversations
          });
          break;
        }
        case 'response.text': {
          updateConversation({
            conversationId: data.conversation_id,
            message: { role: 'assistant', turnId: data.turn_id, text: data.content ?? '' },
            updateStore: updateConversations
          });
          break;
        }
        // default: {
        //   // Fallback: log unknown events as data entries for visibility
        //   if (data && conversationId) {
        //     try {
        //       const summary = typeof data === 'string' ? data : JSON.stringify(data);
        //       updateConversations((draft) => {
        //         const history = draft[conversationId] ?? (draft[conversationId] = []);
        //         history.push({ role: 'data', text: summary, ts: Date.now() });
        //       });
        //     } catch {
        //       updateConversations((draft) => {
        //         const history = draft[conversationId] ?? (draft[conversationId] = []);
        //         history.push({ role: 'data', text: '[unserializable event]', ts: Date.now() });
        //       });
        //     }
        //   }
        //   break;
        // }
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <HeaderBar
        agentId={agentId!}
        status={status}
        turn={turn}
        actionSlot={
          status === 'connected' ? (
            <button
              type="button"
              onClick={disconnect}
              className="px-3 py-1.5 rounded border border-gray-700/70 bg-gray-900/20 text-[11px] uppercase tracking-wider text-gray-200 hover:text-white hover:border-gray-500 transition-colors"
            >
              End Session
            </button>
          ) : null
        }
      />
      {status !== 'connected' ? (
        <div className="rounded-md border border-neutral-800 bg-neutral-950/60  h-[70vh] flex flex-col justify-center items-center gap-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-neutral-100">Connect to your Layercode Voice Agent</h1>
            <p className="text-neutral-400 text-sm max-w-md">Press connect to begin a session with your Layercode voice agent.</p>
          </div>
          <button
            type="button"
            onClick={connect}
            className={`px-6 py-3 rounded-md text-sm font-medium uppercase tracking-wider transition-colors border ${
              !agentId
                ? 'border-neutral-800 text-neutral-600 bg-neutral-900 cursor-not-allowed'
                : 'border-violet-600 bg-violet-600/60 text-white hover:bg-violet-500/70 hover:border-violet-500'
            }`}
          >
            Connect
          </button>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
            <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
              <SpectrumVisualizer label="User" amplitude={userAudioAmplitude * 2} accent="#C4B5FD" />
              {/* <p className="mt-2 text-[11px] leading-5 text-neutral-400">16-bit PCM audio data • 8000 Hz • Mono</p> */}
            </div>
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <MicrophoneButton
                  isMuted={isMuted}
                  userSpeaking={userSpeaking}
                  onToggle={() => {
                    if (isMuted) unmute();
                    else mute();
                  }}
                />
                <div className={`text-[11px] uppercase tracking-wider ${isMuted ? 'text-red-300' : 'text-neutral-400'}`}>{isMuted ? 'Muted' : 'Live'}</div>
              </div>
            </div>
            <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
              <SpectrumVisualizer label="Agent" amplitude={agentAudioAmplitude} accent="#67E8F9" />
              {/* <p className="mt-2 text-[11px] leading-5 text-neutral-400">16-bit PCM audio data • 16000 Hz • Mono</p> */}
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
            <TranscriptConsole entries={activeConversation} />
          </div>

          <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
            <PromptPane />
          </div>
        </div>
      )}
    </div>
  );
}
