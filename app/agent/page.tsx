'use client';

import dynamic from 'next/dynamic';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

const VoiceAgent = dynamic(() => import('../ui/VoiceAgent'), { ssr: false });

export default function AgentPage() {
  const router = useRouter();
  const handleDisconnect = useCallback(() => {
    router.push('/');
  }, [router]);

  return <VoiceAgent onDisconnect={handleDisconnect} />;
}
