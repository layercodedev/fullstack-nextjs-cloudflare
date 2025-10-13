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
import PushToTalkButton from './PushToTalkButton';

export default function VoiceAgent() {
  const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID as string;
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [turn, setTurn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const playNotify = usePlayNotify('/notify1.wav', { volume: 0.8 });
  const userTranscriptChunksRef = useRef<TranscriptCache>(new Map());

  type DataMessage = {
    content: {
      isThinking: boolean;
    };
  };

  const { connect, disconnect, userAudioAmplitude, agentAudioAmplitude, status, mute, unmute, isMuted, triggerUserTurnStarted, triggerUserTurnFinished } = useLayercodeAgent({
    agentId,
    authorizeSessionEndpoint: '/api/authorize',
    onMuteStateChange(isMuted) {
      setMessages((prev) => [...prev, { role: 'data', text: `MIC → ${isMuted ? 'muted' : 'unmuted'}`, ts: Date.now() }]);
    },
    onConnect: (connectData) => {
      setIsPushToTalk(connectData.config?.transcription.trigger === 'push_to_talk');
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
    if (status === 'connecting' || status === 'connected') {
      return;
    }

    try {
      await connect();
      setMessages([]);
      userTranscriptChunksRef.current.clear();
      setTurn('idle');
      setUserSpeaking(false);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to voice agent', error);
    }
  }

  function handleEndSession() {
    window.location.reload();
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
        <HeaderBar agentId={agentId} status={status} turn={turn} isThinking={isThinking} />

        <div className="rounded-md border border-neutral-800 bg-neutral-950/60 h-[70vh] flex flex-col justify-center items-center gap-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-neutral-100">Connect to your Layercode Voice Agent</h1>
            <p className="text-neutral-400 text-sm max-w-md">Press connect to begin a session with your Layercode voice agent.</p>
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={status === 'connecting'}
            className={`px-6 py-3 cursor-pointer rounded-md text-sm font-medium uppercase tracking-wider transition-colors border ${
              status === 'connecting'
                ? 'border-neutral-800 text-neutral-600 bg-neutral-900 cursor-not-allowed'
                : 'border-violet-600 bg-violet-600/60 text-white hover:bg-violet-500/70 hover:border-violet-500'
            }`}
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
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
            {isPushToTalk ? (
              <PushToTalkButton triggerUserTurnFinished={triggerUserTurnFinished} triggerUserTurnStarted={triggerUserTurnStarted} />
            ) : (
              <MicrophoneButton
                isMuted={isMuted}
                userIsSpeaking={userSpeaking}
                onToggleAction={() => {
                  if (isMuted) unmute();
                  else mute();
                }}
              />
            )}
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
