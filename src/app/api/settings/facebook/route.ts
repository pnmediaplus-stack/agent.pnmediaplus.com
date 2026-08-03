import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationsConfig, saveIntegrationsConfig } from '@/lib/config/integrations';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';
import { z } from 'zod';

export async function GET(req: Request) {
  const auth = await verifyUiAuth(req);
  if (!auth.ok) return auth.response;

  const token = readPortalAccessToken(req.headers);
  const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
  
  if (orgContext.state !== 'ready') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Org context not ready' }, { status: 403 });
  }

  const organizationId = orgContext.active_membership.organization_id;
  const config = await getIntegrationsConfig(organizationId);
  // Mask the token in the GET response for security
  const fbConfig = config.facebook ? {
    pageId: config.facebook.pageId,
    enabled: config.facebook.enabled,
    accessTokenPreview: config.facebook.accessToken ? 
      `${config.facebook.accessToken.substring(0, 5)}...${config.facebook.accessToken.substring(config.facebook.accessToken.length - 5)}` : ''
  } : null;
  
  await auth.logAudit('READ_FB_CONFIG', 'User viewed Facebook integration settings');
  return NextResponse.json({ facebook: fbConfig });
}

export async function POST(req: Request) {
  const auth = await verifyUiAuth(req);
  if (!auth.ok) return auth.response;

  // Strict role-based authorization for POST actions
  const token = readPortalAccessToken(req.headers);
  const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
  
  if (orgContext.state !== 'ready' || orgContext.active_membership.role !== 'admin') {
    await auth.logAudit('FB_CONFIG_FORBIDDEN', 'User attempted to modify FB config without admin role');
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin role is required to modify or test Facebook configuration.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, pageId, accessToken, enabled } = body;
    const organizationId = orgContext.active_membership.organization_id;
    const currentConfig = await getIntegrationsConfig(organizationId);

    if (action === 'test') {
      // Test the token via Graph API
      const tokenToTest = accessToken || currentConfig.facebook?.accessToken;
      if (!tokenToTest) {
        return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
      }

      const res = await fetch('https://graph.facebook.com/v22.0/me?access_token=' + tokenToTest);
      const data = await res.json();

      await auth.logAudit('TEST_FB_TOKEN', 'User tested Facebook connection token', { success: !data.error });

      if (data.error) {
        return NextResponse.json({ success: false, error: data.error.message });
      }

      return NextResponse.json({ success: true, user: data });
    }

    if (action === 'save') {
      // Only update fields that are provided. If token is masked (e.g. "EA...abcde"), don't overwrite with mask.
      const newFbConfig = {
        pageId: pageId !== undefined ? pageId : currentConfig.facebook?.pageId || '',
        enabled: enabled !== undefined ? enabled : currentConfig.facebook?.enabled || false,
        accessToken: currentConfig.facebook?.accessToken || ''
      };

      // If user typed a new unmasked token, save it
      if (accessToken && !accessToken.includes('...')) {
        newFbConfig.accessToken = accessToken;
      }

      await saveIntegrationsConfig(organizationId, {
        ...currentConfig,
        facebook: newFbConfig
      });

      await auth.logAudit('SAVE_FB_CONFIG', 'User updated Facebook integration settings', { 
        pageId: newFbConfig.pageId,
        enabled: newFbConfig.enabled,
        hasNewToken: !!(accessToken && !accessToken.includes('...'))
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
