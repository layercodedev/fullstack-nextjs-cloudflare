interface WebhookLogsLinkProps {
  status: string;
  agentId: string;
}

export function WebhookLogsLink({ status, agentId }: WebhookLogsLinkProps) {
  const webhookLogsUrl = `https://dash.layercode.com/agents/${agentId}/webhook-logs`;

  return (
    <div className="justify-self-end">
      <a
        href={webhookLogsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm dark:shadow-gray-900/30 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span className="hidden sm:inline">View your live webhook logs here</span>
        <span className="sm:hidden">Webhook logs</span>
      </a>
    </div>
  );
}
