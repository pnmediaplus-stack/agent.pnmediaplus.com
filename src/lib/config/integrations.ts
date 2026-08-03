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

const decryptToken = (encryptedToken: string): string => {
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

export const getIntegrationsConfig = (): IntegrationsConfig => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(fileContent) as IntegrationsConfig;
    if (config.facebook && config.facebook.accessToken) {
      config.facebook.accessToken = decryptToken(config.facebook.accessToken);
    }
    return config;
  } catch (error) {
    console.error('Error reading integrations config:', error);
    return {};
  }
};

export const saveIntegrationsConfig = (config: IntegrationsConfig) => {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const configToSave = JSON.parse(JSON.stringify(config)); // deep clone
    if (configToSave.facebook && configToSave.facebook.accessToken) {
      configToSave.facebook.accessToken = encryptToken(configToSave.facebook.accessToken);
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving integrations config:', error);
    throw error;
  }
};
