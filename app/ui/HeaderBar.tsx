"use client";

import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';

export function HeaderBar({ status }: { status: string }) {
  return (
    <header className="flex items-center justify-end mb-4 text-sm">
      <ConnectionStatusIndicator status={status} />
    </header>
  );
}


