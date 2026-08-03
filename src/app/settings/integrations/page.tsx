'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Facebook, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const [pageId, setPageId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const { toast } = useToast();

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
        toast({ title: 'Saved successfully', description: 'Facebook settings have been updated.' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Could not save settings.', variant: 'destructive' });
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
        toast({ title: 'Connection Successful', description: 'Token is valid.' });
      } else {
        setTestResult({ success: false, message: data.error });
        toast({ title: 'Connection Failed', description: data.error, variant: 'destructive' });
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
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Integrations</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Facebook className="text-blue-600 h-6 w-6" />
            <CardTitle>Facebook Page Publisher</CardTitle>
          </div>
          <CardDescription>Configure credentials for the Auto-Publisher to post directly to your Fanpage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto-Publishing</Label>
              <div className="text-sm text-muted-foreground">Allow the system to post automatically when a campaign is approved.</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pageId">Facebook Page ID</Label>
            <Input 
              id="pageId" 
              value={pageId} 
              onChange={e => setPageId(e.target.value)} 
              placeholder="e.g. 10456218793214"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Page Access Token</Label>
            <Input 
              id="token" 
              type="password"
              value={accessToken} 
              onChange={e => setAccessToken(e.target.value)} 
              placeholder="EAA..."
            />
            <p className="text-xs text-muted-foreground">Long-lived Page Access Token from Facebook Developer Portal.</p>
          </div>

          {testResult && (
            <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${testResult.success ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" onClick={handleTest} disabled={testing || !accessToken}>
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
