"use client";

import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { WebhookLogsLink } from './WebhookLogsLink';

type TurnState = 'idle' | 'user' | 'assistant';

export function HeaderBar({ agentId, status, turn }: { agentId: string; status: string; turn: TurnState }) {
  function copyAgentId() {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(agentId).catch(() => {});
    }
  }

  return (
    <header className="flex items-center justify-between mb-4 text-sm">
      <div className="flex items-center gap-3">
        <ConnectionStatusIndicator status={status} />
      </div>
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wider text-neutral-400">Turn:</span>
          <span
            className={`inline-flex items-center justify-center w-24 px-2 py-1 rounded border text-[11px] uppercase tracking-wider ${
              turn === 'assistant'
                ? 'border-cyan-700 text-cyan-300'
                : turn === 'user'
                ? 'border-emerald-700 text-emerald-300'
                : 'border-neutral-700 text-gray-400'
            }`}
          >
            {turn}
          </span>
        </div>
        <button
          onClick={copyAgentId}
          className="px-2 py-1 rounded border border-neutral-700 text-[11px] uppercase tracking-wider text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
          title="Copy agent id"
        >
          agent: {agentId}
        </button>
        <WebhookLogsLink agentId={agentId} />
        <a
          href="https://docs.layercode.com/"
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded border border-neutral-700 text-[11px] uppercase tracking-wider text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
        >
          Docs
        </a>
      </div>
    </header>
  );
}


