import { ConnectScreen } from './ui/ConnectScreen';

export default function Home() {
  return <ConnectScreen agentId={process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID} />;
}
