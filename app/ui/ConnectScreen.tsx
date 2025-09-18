'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HeaderBar } from './HeaderBar';

type ConnectScreenProps = {
  agentId?: string;
};

export function ConnectScreen({ agentId }: ConnectScreenProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const hasAgentId = Boolean(agentId);

  function handleConnect() {
    if (!hasAgentId) return;
    setIsNavigating(true);
    router.push('/agent');
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
          disabled={!hasAgentId || isNavigating}
          className={`px-6 py-3 rounded-md text-sm font-medium uppercase tracking-wider transition-colors border ${
            !hasAgentId
              ? 'border-neutral-800 text-neutral-600 bg-neutral-900 cursor-not-allowed'
              : 'border-violet-600 bg-violet-600/60 text-white hover:bg-violet-500/70 hover:border-violet-500'
          }`}
        >
          {isNavigating ? 'Connecting…' : hasAgentId ? 'Connect' : 'Missing agent id'}
        </button>
        {!hasAgentId ? (
          <p className="text-xs text-neutral-500 max-w-sm">
            Set <code className="text-neutral-300">NEXT_PUBLIC_LAYERCODE_AGENT_ID</code> in your environment to enable the connect flow.
          </p>
        ) : null}
      </div>
    </div>
  );
}
