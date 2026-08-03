'use client';

import { useState, useEffect } from 'react';
import { Facebook, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { TenantIntegrationsView } from '@/components/phase070/TenantIntegrationsView';
import { TokenAnalyticsView } from '@/components/phase10/TokenAnalyticsView';

export default function IntegrationsSettingsPage() {
  const [pageId, setPageId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/facebook')
      .then(res => res.json())
      .then(data => {
        if (data.facebook) {
          setPageId(data.facebook.pageId || '');
          setAccessToken(data.facebook.accessTokenPreview || '');
          setEnabled(data.facebook.enabled || false);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', pageId, accessToken, enabled })
      });
      if (res.ok) {
        alert('Saved successfully: Facebook settings have been updated.');
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      alert('Error: Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', accessToken })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: `Connected as: ${data.user.name || 'Valid Token'}` });
      } else {
        setTestResult({ success: false, message: data.error });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Network error or endpoint unreachable' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-12">
      <h1 className="text-3xl font-bold">Integrations & Billing</h1>

      {/* AI Analytics (Phase 10) */}
      <section>
        <h2 className="text-xl font-semibold mb-4">AI Usage & Quota</h2>
        <TokenAnalyticsView />
      </section>

      {/* AI Integrations (Phase 9 BYOK UI) */}
      <section>
        <h2 className="text-xl font-semibold mb-4">AI Providers (BYOK)</h2>
        <TenantIntegrationsView />
      </section>

      {/* Social Integrations */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Social Publishers</h2>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Facebook className="text-blue-500 h-6 w-6" />
              <h3 className="text-lg font-semibold text-slate-100">Facebook Page Publisher</h3>
            </div>
            <p className="text-sm text-slate-400">Configure credentials for the Auto-Publisher to post directly to your Fanpage.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium leading-none text-slate-200">Enable Auto-Publishing</label>
                <div className="text-sm text-slate-400">Allow the system to post automatically when a campaign is approved.</div>
              </div>
              <button 
                type="button" 
                role="switch" 
                aria-checked={enabled} 
                onClick={() => setEnabled(!enabled)}
                className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="pageId" className="text-sm font-medium leading-none text-slate-200">Facebook Page ID</label>
              <input 
                id="pageId" 
                value={pageId} 
                onChange={e => setPageId(e.target.value)} 
                placeholder="e.g. 10456218793214"
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 ring-offset-slate-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium leading-none text-slate-200">Page Access Token</label>
              <input 
                id="token" 
                type="password"
                value={accessToken} 
                onChange={e => setAccessToken(e.target.value)} 
                placeholder="EAA..."
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 ring-offset-slate-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              />
              <p className="text-xs text-slate-400">Long-lived Page Access Token from Facebook Developer Portal.</p>
            </div>

            {testResult && (
              <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${testResult.success ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/30 text-rose-400 border border-rose-900/50'}`}>
                {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.message}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center border-t border-slate-700/50 p-6 bg-slate-900/20">
            <button 
              onClick={handleTest} 
              disabled={testing || !accessToken}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-50 border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200 h-10 px-4 py-2"
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-50 bg-cyan-600 hover:bg-cyan-700 text-white h-10 px-4 py-2"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
