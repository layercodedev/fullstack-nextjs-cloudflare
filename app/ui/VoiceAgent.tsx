'use client';

import { useLayercodeAgent } from '@layercode/react-sdk';
import { useEffect, useRef, useState } from 'react';
import TranscriptConsole from './TranscriptConsole';
import PromptPane from './PromptPane';
import { HeaderBar } from './HeaderBar';
import { SignalPanel } from './SignalPanel';

type Entry = { role: string; text: string; ts: number; turnId?: string };

export default function VoiceAgent() {
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
        <div className="rounded-md border border-red-900/50 bg-red-950/40 text-red-300 p-4">
          Error: NEXT_PUBLIC_LAYERCODE_AGENT_ID is not set.
        </div>
      </div>
    );
  }
  return <VoiceAgentInner agentId={agentId} />;
}

function VoiceAgentInner({ agentId }: { agentId: string }) {
  // Transcript and signal state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [turn, setTurn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [vadStatus, setVadStatus] = useState<'idle' | 'speech' | 'silence' | 'failed'>('idle');
  const userTurnIndex = useRef<Record<string, number>>({});
  const assistantTurnIndex = useRef<Record<string, number>>({});

  // Helper to upsert streaming text into entries
  function upsertStreamingEntry(params: { role: 'user' | 'assistant'; turnId?: string; text: string; replace?: boolean }) {
    const { role, turnId, text, replace } = params;
    if (!turnId) {
      // No turn id, just append as a standalone entry
      setEntries(prev => [...prev, { role, text, ts: Date.now() }]);
      return;
    }

    const indexMap = role === 'user' ? userTurnIndex.current : assistantTurnIndex.current;
    const existingIndex = indexMap[turnId];
    if (existingIndex === undefined) {
      setEntries(prev => {
        const nextIndex = prev.length;
        indexMap[turnId] = nextIndex;
        return [...prev, { role, text, ts: Date.now(), turnId }];
      });
    } else {
      setEntries(prev => {
        const copy = prev.slice();
        const current = copy[existingIndex];
        copy[existingIndex] = {
          ...current,
          text: replace ? text : current.text + text,
        };
        return copy;
      });
    }
  }

  const { userAudioAmplitude, agentAudioAmplitude, status, mute, unmute, isMuted } = useLayercodeAgent({
    agentId,
    authorizeSessionEndpoint: '/api/authorize',
    _websocketUrl: 'wss://api-staging.layercode.com/v1/agents/web/websocket',
    onMuteStateChange(isMuted) {
      setEntries(prev => [...prev, { role: 'data', text: `MIC → ${isMuted ? 'muted' : 'unmuted'}`, ts: Date.now() }]);
    },
    onMessage: (data: any) => {
      // Expected event shapes include:
      // - { type: 'turn.start', role: 'user' | 'assistant' }
      // - { type: 'user.transcript.delta', content: string, turn_id: string }
      // - { type: 'user.transcript', content: string, turn_id: string }
      // - { type: 'response.text', content: string, turn_id: string }
      // - { type: 'response.completed', turn_id: string }
      // - { type: 'vad_events', event: 'vad_start' | 'vad_end' | 'failed' }

      const ts = Date.now();
      switch (data?.type) {
        case 'turn.start': {
          if (data.role === 'user' || data.role === 'assistant') {
            setTurn(data.role);
            // Optional: log turn change as a data entry for visibility
            setEntries(prev => [...prev, { role: 'data', text: `TURN → ${data.role}`, ts }]);
          }
          break;
        }
        case 'user.transcript.delta': {
          upsertStreamingEntry({ role: 'user', turnId: data.turn_id, text: data.content ?? '' });
          break;
        }
        case 'user.transcript': {
          // Final transcript for the user; replace accumulated text to ensure correctness
          upsertStreamingEntry({ role: 'user', turnId: data.turn_id, text: data.content ?? '', replace: true });
          // After user finishes talking, VAD likely ended; keep vadStatus updates driven by vad_events
          break;
        }
        case 'response.text': {
          upsertStreamingEntry({ role: 'assistant', turnId: data.turn_id, text: data.content ?? '' });
          break;
        }
        case 'response.completed': {
          // Assistant finished speaking
          setTurn('idle');
          break;
        }
        case 'vad_events': {
          if (data.event === 'vad_start') setVadStatus('speech');
          else if (data.event === 'vad_end') setVadStatus('silence');
          else if (data.event === 'failed' || data.event === 'vad_failed') setVadStatus('failed');
          // Also log VAD events to the transcript for debugging
          setEntries(prev => [...prev, { role: 'data', text: `VAD → ${data.event}`, ts }]);
          break;
        }
        default: {
          // Fallback: log unknown events as data entries for visibility
          if (data) {
            try {
              const summary = typeof data === 'string' ? data : JSON.stringify(data);
              setEntries(prev => [...prev, { role: 'data', text: summary, ts }]);
            } catch {
              setEntries(prev => [...prev, { role: 'data', text: '[unserializable event]', ts }]);
            }
          }
          break;
        }
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <HeaderBar agentId={agentId} status={status} turn={turn} />

      <div className="rounded-md border border-neutral-800 bg-neutral-950/60 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
        <div className="grid grid-cols-12">
          <div className="col-span-6 border-r border-neutral-800">
            <div className="px-4 py-2 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-400">Transcript</div>
            <TranscriptConsole entries={entries} />
          </div>

          <div className="col-span-3 border-r border-neutral-800">
            <div className="px-4 py-2 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-400">Signal</div>
            <SignalPanel
              userAudioAmplitude={userAudioAmplitude}
              agentAudioAmplitude={agentAudioAmplitude}
              vadStatus={vadStatus}
              isMuted={isMuted}
              onToggleMute={() => { if (isMuted) unmute(); else mute(); }}
            />
          </div>

          <div className="col-span-3">
            <PromptPane />
          </div>
        </div>
      </div>

      
    </div>
  );
}
