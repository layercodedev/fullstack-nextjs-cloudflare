'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { HeaderBar } from './HeaderBar';

const VoiceAgent = dynamic(() => import('./VoiceAgent'), { ssr: false });

type ConnectScreenProps = {
  agentId?: string;
};

export function ConnectScreen({ agentId }: ConnectScreenProps) {
  const [isConnected, setIsConnected] = useState(false);
  const hasAgentId = Boolean(agentId);

  if (isConnected) {
    return <VoiceAgent onDisconnect={() => setIsConnected(false)} />;
  }

  function handleConnect() {
    if (!hasAgentId) return;
    setIsConnected(true);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <HeaderBar agentId={agentId ?? 'unknown'} status={hasAgentId ? 'disconnected' : 'error'} turn="idle" />

      <div className="rounded-md border border-neutral-800 bg-neutral-950/60  h-[70vh] flex flex-col justify-center items-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-100">Connect to your Layercode Voice Agent</h1>
          <p className="text-neutral-400 text-sm max-w-md">Press connect to begin a session with your Layercode voice agent.</p>
        </div>
        <button
          type="button"
          onClick={handleConnect}
          disabled={!hasAgentId}
          className={`px-6 py-3 rounded-md text-sm font-medium uppercase tracking-wider transition-colors border ${
            !hasAgentId
              ? 'border-neutral-800 text-neutral-600 bg-neutral-900 cursor-not-allowed'
              : 'border-violet-600 bg-violet-600/60 text-white hover:bg-violet-500/70 hover:border-violet-500'
          }`}
        >
          Connect
        </button>
      </div>
    </div>
  );
}
