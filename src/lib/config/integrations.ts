import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface FacebookIntegrationConfig {
  pageId: string;
  accessToken: string;
  enabled: boolean;
}

export interface IntegrationsConfig {
  facebook?: FacebookIntegrationConfig;
}

const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'integrations.json');

const getEncryptionKey = () => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 10) {
    throw new Error('ENCRYPTION_KEY_MISSING_FAIL_CLOSED');
  }
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptToken = (token: string): string => {
  if (!token) return token;
  const iv = crypto.randomBytes(12); // GCM standard IV length is 12 bytes
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
};

export const decryptToken = (encryptedToken: string): string => {
  if (!encryptedToken || !encryptedToken.includes(':')) return encryptedToken;
  try {
    const parts = encryptedToken.split(':');
    if (parts.length !== 3) throw new Error('INVALID_CIPHER_FORMAT');
    const [ivHex, encrypted, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Lỗi giải mã token:', e);
    return '';
  }
};

export const getIntegrationsConfig = async (organizationId: string): Promise<IntegrationsConfig> => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey || !organizationId) {
      return {};
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/social_publishers_config?organization_id=eq.${organizationId}&select=*`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) return {};
    
    const rows = await res.json();
    if (!rows || rows.length === 0) return {};

    const row = rows[0];
    const config: IntegrationsConfig = {
      facebook: {
        pageId: row.facebook_page_id || '',
        accessToken: decryptToken(row.facebook_access_token) || '',
        enabled: row.facebook_enabled === true
      }
    };
    return config;
  } catch (error) {
    console.error('Error reading integrations config from DB:', error);
    return {};
  }
};

export const saveIntegrationsConfig = async (organizationId: string, config: IntegrationsConfig) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey || !organizationId) {
      throw new Error('Missing Supabase config or organizationId');
    }

    const fbConfig = config.facebook || { pageId: '', accessToken: '', enabled: false };
    const encryptedToken = encryptToken(fbConfig.accessToken || '');

    const payload = {
      organization_id: organizationId,
      facebook_page_id: fbConfig.pageId,
      facebook_access_token: encryptedToken,
      facebook_enabled: fbConfig.enabled,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/social_publishers_config`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to save config: ${err}`);
    }
  } catch (error) {
    console.error('Error saving integrations config to DB:', error);
    throw error;
  }
};
