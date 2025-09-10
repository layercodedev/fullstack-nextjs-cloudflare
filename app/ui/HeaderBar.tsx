import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { WebhookLogsLink } from './WebhookLogsLink';

type TurnState = 'idle' | 'user' | 'assistant';

export function HeaderBar({ agentId, status, turn }: { agentId: string; status: any; turn: TurnState }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="text-sm tracking-widest uppercase text-neutral-400">Layercode Voice Agent</span>
        <span className="text-neutral-700">/</span>
        <ConnectionStatusIndicator status={status} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-neutral-400">Turn</span>
          <span
            className={`px-2 py-1 rounded border text-[11px] uppercase tracking-wider ${
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

        <span className="text-neutral-700">/</span>

        <a
          href={`https://dash.layercode.com/agents/${agentId}`}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded border border-neutral-700 text-[11px] uppercase tracking-wider text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
          title="Open Agent in Layercode Dashboard"
        >
          agent: {agentId}
        </a>

        <span className="text-neutral-700">/</span>

        <WebhookLogsLink status={status} agentId={agentId} />
      </div>
    </div>
  );
}


