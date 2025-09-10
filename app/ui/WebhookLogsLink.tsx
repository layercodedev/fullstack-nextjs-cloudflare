"use client";

interface WebhookLogsLinkProps {
  agentId: string;
}

export function WebhookLogsLink({ agentId }: WebhookLogsLinkProps) {
  const webhookLogsUrl = `https://dash.layercode.com/agents/${agentId}/webhook-logs`;

  return (
    <a
      href={webhookLogsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="px-2 py-1 rounded border border-neutral-700 text-[11px] uppercase tracking-wider text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
    >
      View live webhook logs
    </a>
  );
}
