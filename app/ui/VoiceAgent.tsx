'use client';

import { useLayercodeAgent } from '@layercode/react-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import TranscriptConsole from './TranscriptConsole';
import PromptPane from './PromptPane';
import { HeaderBar } from './HeaderBar';
import SpectrumVisualizer from './SpectrumVisualizer';
import { MicrophoneButton } from './MicrophoneButton';

type Entry = { role: string; text: string; ts: number; turnId?: string };

type VoiceAgentProps = {
  onDisconnect?: () => void;
};

export default function VoiceAgent({ onDisconnect }: VoiceAgentProps = {}) {
  const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  if (!agentId) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm tracking-widest uppercase text-neutral-400">Layercode Voice Agent</span>
          </div>
        </div>
        <div className="rounded-md border border-red-900/50 bg-red-950/40 text-red-300 p-4">Error: NEXT_PUBLIC_LAYERCODE_AGENT_ID is not set.</div>
      </div>
    );
  }
  return <VoiceAgentInner agentId={agentId} onDisconnect={onDisconnect} />;
}

function VoiceAgentInner({ agentId, onDisconnect }: { agentId: string; onDisconnect?: () => void }) {
  // Transcript and signal state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [turn, setTurn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const userTurnIndex = useRef<Record<string, number>>({});
  const assistantTurnIndex = useRef<Record<string, number>>({});
  const notifyRef = useRef<HTMLAudioElement | null>(null);
  const [pendingAction, setPendingAction] = useState<'connect' | 'disconnect' | null>(null);

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

  // Helper to upsert streaming text into entries
  function upsertStreamingEntry(params: { role: 'user' | 'assistant'; turnId?: string; text: string; replace?: boolean }) {
    const { role, turnId, text, replace } = params;
    if (!turnId) {
      // No turn id, just append as a standalone entry
      setEntries((prev) => [...prev, { role, text, ts: Date.now() }]);
      return;
    }

    const indexMap = role === 'user' ? userTurnIndex.current : assistantTurnIndex.current;
    const existingIndex = indexMap[turnId];
    if (existingIndex === undefined) {
      setEntries((prev) => {
        const nextIndex = prev.length;
        indexMap[turnId] = nextIndex;
        return [...prev, { role, text, ts: Date.now(), turnId }];
      });
    } else {
      setEntries((prev) => {
        const copy = prev.slice();
        const current = copy[existingIndex];
        copy[existingIndex] = {
          ...current,
          text: replace ? text : current.text + text
        };
        return copy;
      });
    }
  }

  const resetConversationState = useCallback(() => {
    setEntries([]);
    setTurn('idle');
    setUserSpeaking(false);
    userTurnIndex.current = {};
    assistantTurnIndex.current = {};
  }, []);

  const { userAudioAmplitude, agentAudioAmplitude, status, mute, unmute, isMuted, connect, disconnect } = useLayercodeAgent({
    agentId,
    authorizeSessionEndpoint: '/api/authorize',
    onMuteStateChange(isMuted) {
      setEntries((prev) => [...prev, { role: 'data', text: `MIC → ${isMuted ? 'muted' : 'unmuted'}`, ts: Date.now() }]);
    },
    onMessage: (data: any) => {
      console.log(data);
      const ts = Date.now();
      switch (data?.type) {
        case 'turn.start': {
          setTurn(data.role);
          if (data.role == 'assistant') {
            playNotify();
          }
          // Optional: log turn change as a data entry for visibility
          // setEntries((prev) => [...prev, { role: 'data', text: `TURN → ${data.role}`, ts }]);
          break;
        }
        case 'vad_events': {
          setUserSpeaking(data.event == 'vad_start');
          break;
        }
        case 'user.transcript.delta': {
          upsertStreamingEntry({ role: 'user', turnId: data.turn_id, text: data.content ?? '' });
          break;
        }
        case 'response.text': {
          upsertStreamingEntry({ role: 'assistant', turnId: data.turn_id, text: data.content ?? '' });
          break;
        }
        // default: {
        //   // Fallback: log unknown events as data entries for visibility
        //   if (data) {
        //     try {
        //       const summary = typeof data === 'string' ? data : JSON.stringify(data);
        //       setEntries((prev) => [...prev, { role: 'data', text: summary, ts }]);
        //     } catch {
        //       setEntries((prev) => [...prev, { role: 'data', text: '[unserializable event]', ts }]);
        //     }
        //   }
        //   break;
        // }
      }
    }
  });

  const isConnecting = status === 'connecting' || pendingAction === 'connect';
  const isConnected = status === 'connected';
  const buttonDisabled = isConnected ? pendingAction === 'disconnect' : isConnecting;

  const handleConnect = useCallback(async () => {
    if (isConnecting) return;
    setPendingAction('connect');
    resetConversationState();
    try {
      await connect({ newConversation: true });
    } catch (error) {
      console.error('Failed to connect to Layercode agent', error);
    } finally {
      setPendingAction(null);
    }
  }, [connect, isConnecting, resetConversationState]);

  const handleDisconnect = useCallback(async () => {
    if (pendingAction === 'disconnect') return;
    setPendingAction('disconnect');
    try {
      await disconnect({ clearConversationId: true });
      resetConversationState();
      onDisconnect?.();
    } catch (error) {
      console.error('Failed to disconnect from Layercode agent', error);
    } finally {
      setPendingAction(null);
    }
  }, [disconnect, onDisconnect, pendingAction, resetConversationState]);

  const actionSlot =
    isConnected || pendingAction === 'disconnect' ? (
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={pendingAction === 'disconnect'}
        className="px-3 py-1.5 rounded border border-gray-700/70 bg-gray-900/20 text-[11px] uppercase tracking-wider text-gray-200 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-60"
      >
        {pendingAction === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
      </button>
    ) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <HeaderBar agentId={agentId} status={status} turn={turn} actionSlot={actionSlot} />
      <div className="rounded-md border border-neutral-800 bg-neutral-950/60  h-[70vh] flex flex-col justify-center items-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-100">Connect to your Layercode Voice Agent</h1>
          <p className="text-neutral-400 text-sm max-w-md">
            {isConnected ? 'You are connected to your agent. Disconnect to end the current session.' : 'Press connect to begin a session with your Layercode voice agent.'}
          </p>
        </div>
        <button
          type="button"
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={buttonDisabled}
          className={`px-6 py-3 rounded-md text-sm font-medium uppercase tracking-wider transition-colors border ${
            isConnected
              ? 'border-rose-600 bg-rose-600/60 text-white hover:bg-rose-500/70 hover:border-rose-500 disabled:opacity-60'
              : buttonDisabled
                ? 'border-neutral-800 text-neutral-600 bg-neutral-900 cursor-not-allowed'
                : 'border-violet-600 bg-violet-600/60 text-white hover:bg-violet-500/70 hover:border-violet-500'
          }`}
        >
          {isConnected ? (pendingAction === 'disconnect' ? 'Disconnecting…' : 'Disconnect') : isConnecting ? 'Connecting…' : 'Connect'}
        </button>
      </div>

      {isConnected ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
            <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
              <SpectrumVisualizer label="User" amplitude={userAudioAmplitude * 2} accent="#C4B5FD" />
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
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
            <TranscriptConsole entries={entries} />
          </div>

          <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
            <PromptPane />
          </div>
        </>
      ) : null}
    </div>
  );
}
