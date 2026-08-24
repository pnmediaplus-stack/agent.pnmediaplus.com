import { Metadata } from 'next';
import OmnichannelWorkspace from '@/components/crm/OmnichannelWorkspace';

export const metadata: Metadata = {
  title: 'Omnichannel CRM',
  description: 'AI-powered Customer Support Dashboard',
};

export default function OmnichannelPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">
      <OmnichannelWorkspace />
    </div>
  );
}
