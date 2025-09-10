import config from '@/layercode.config.json';

export default function PromptPane() {
  const prompt: string = (config as any)?.prompt || '';

  return (
    <div className="h-[56vh] flex flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 bg-neutral-950/70 backdrop-blur-sm border-b border-neutral-800 px-4 py-2 text-xs text-neutral-400 tracking-wider uppercase">
        Prompt
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-neutral-300">{prompt}</pre>
      </div>
    </div>
  );
}
