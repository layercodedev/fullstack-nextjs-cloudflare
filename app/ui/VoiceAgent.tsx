'use client';

import { useLayercodeAgent } from '@layercode/react-sdk';
import { useEffect, useRef, useState } from 'react';
import { usePlayNotify } from '../utils/usePlayNotify';
import { handleUserTranscriptDelta, updateMessages, type ConversationEntry, type TranscriptCache } from '../utils/updateMessages';
import { HeaderBar } from './HeaderBar';
import { MicrophoneButton } from './MicrophoneButton';
import PromptPane from './PromptPane';
import SpectrumVisualizer from './SpectrumVisualizer';
import TranscriptConsole from './TranscriptConsole';

export default function VoiceAgent() {
  const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID as string;
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [turn, setTurn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [docsUrlInput, setDocsUrlInput] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const playNotify = usePlayNotify('/notify1.wav', { volume: 0.8 });
  const userTranscriptChunksRef = useRef<TranscriptCache>(new Map());

  type DataMessage = {
    content: {
      isThinking: boolean;
    };
  };

  const { connect, disconnect, userAudioAmplitude, agentAudioAmplitude, status, mute, unmute, isMuted } = useLayercodeAgent({
    agentId,
    authorizeSessionEndpoint: '/api/authorize',
    onMuteStateChange(isMuted) {
      setMessages((prev) => [...prev, { role: 'data', text: `MIC → ${isMuted ? 'muted' : 'unmuted'}`, ts: Date.now() }]);
    },
    onMessage: (data: any) => {
      console.log(data);
      switch (data?.type) {
        case 'turn.start': {
          setTurn(data.role);
          if (data.role === 'assistant') {
            playNotify();
          }
          break;
        }
        case 'vad_events': {
          setUserSpeaking(data.event === 'vad_start');
          break;
        }
        case 'turn.end': {
          if (data.turn_id) {
            userTranscriptChunksRef.current.delete(data.turn_id as string);
          }
          break;
        }
        case 'user.transcript.interim_delta':
        case 'user.transcript.delta': {
          handleUserTranscriptDelta({
            message: data,
            cache: userTranscriptChunksRef.current,
            setMessages
          });
          break;
        }
        case 'response.text': {
          updateMessages({
            role: 'assistant',
            turnId: data.turn_id,
            text: data.content ?? '',
            setMessages
          });
          break;
        }
      }
    },
    onDataMessage: (data: DataMessage) => setIsThinking(data.content.isThinking)
  });

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  async function handleConnect() {
    if (status === 'connecting' || status === 'connected' || isPreparingSession) {
      return;
    }

    if (!docsUrlInput.trim() || !companyNameInput.trim()) {
      return;
    }

    try {
      setIsPreparingSession(true);
      const response = await fetch('/api/runtime-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          docsUrl: docsUrlInput.trim(),
          companyName: companyNameInput.trim()
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody?.error || response.statusText || 'Failed to update runtime config';
        console.error('Failed to update runtime config', errorMessage);
        return;
      }

      await connect();
      setMessages([]);
      userTranscriptChunksRef.current.clear();
      setTurn('idle');
      setUserSpeaking(false);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to voice agent', error);
    } finally {
      setIsPreparingSession(false);
    }
  }

  function handleEndSession() {
    window.location.reload();
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
        <HeaderBar agentId={agentId} status={status} turn={turn} isThinking={isThinking} />

        <div className="rounded-md border border-neutral-800 bg-neutral-950/60 h-[70vh] flex flex-col justify-center items-center gap-6 text-center px-6">
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-semibold text-neutral-100">Connect your docs to your Layercode voice agent</h1>
            <p className="text-neutral-400 text-sm">
              Provide your company name and docs URL so the agent can answer questions about your knowledge base in real time.
            </p>
          </div>
          <form
            className="w-full max-w-sm space-y-4 text-left"
            onSubmit={(event) => {
              event.preventDefault();
              void handleConnect();
            }}
          >
            <div className="space-y-1">
              <label htmlFor="company-name" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Company Name
              </label>
              <input
                id="company-name"
                type="text"
                placeholder="Layercode"
                value={companyNameInput}
                onChange={(event) => setCompanyNameInput(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                required
              />
              <p className="text-[11px] text-neutral-500">We&apos;ll reference this in the welcome message and system prompt.</p>
            </div>
            <div className="space-y-1">
              <label htmlFor="docs-url" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
                Docs URL
              </label>
              <input
                id="docs-url"
                type="url"
                placeholder="https://your-docs.example.com"
                value={docsUrlInput}
                onChange={(event) => setDocsUrlInput(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                required
              />
              <p className="text-[11px] text-neutral-500">
                Enter the base URL for your docs; we&apos;ll automatically use its <code>/mcp</code> endpoint.
              </p>
            </div>
            <button
              type="submit"
              disabled={
                status === 'connecting' ||
                status === 'connected' ||
                isPreparingSession ||
                !docsUrlInput.trim() ||
                !companyNameInput.trim()
              }
              className={`w-full px-6 py-3 cursor-pointer rounded-md text-sm font-medium uppercase tracking-wider transition-colors border ${
                status === 'connecting' ||
                status === 'connected' ||
                isPreparingSession ||
                !docsUrlInput.trim() ||
                !companyNameInput.trim()
                  ? 'border-neutral-800 text-neutral-600 bg-neutral-900 cursor-not-allowed'
                  : 'border-violet-600 bg-violet-600/60 text-white hover:bg-violet-500/70 hover:border-violet-500'
              }`}
            >
              {status === 'connecting'
                ? 'Connecting...'
                : isPreparingSession
                ? 'Preparing...'
                : 'Connect'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <HeaderBar
        agentId={agentId}
        status={status}
        turn={turn}
        isThinking={isThinking}
        actionSlot={
          <button
            type="button"
            onClick={handleEndSession}
            className="px-3 py-1.5 rounded cursor-pointer border border-gray-700/70 bg-gray-900/20 text-[11px] uppercase tracking-wider text-gray-200 hover:text-white hover:border-gray-500 transition-colors"
          >
            End Session
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
        <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
          <SpectrumVisualizer label="User" amplitude={userAudioAmplitude * 2} accent="#C4B5FD" />
        </div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <MicrophoneButton
              isMuted={isMuted}
              userIsSpeaking={userSpeaking}
              onToggleAction={() => {
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
        <TranscriptConsole entries={messages} />
      </div>

      <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
        <PromptPane />
      </div>
    </div>
  );
}
