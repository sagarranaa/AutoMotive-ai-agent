import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root = fileURLToPath(new URL('../../..', import.meta.url));
export function getConfig(env=process.env) {
  const c = { port:Number(env.PORT || 4000), host:env.HOST || '127.0.0.1', crmMode:env.CRM_MODE || 'mock', llmMode:env.LLM_MODE || 'demo',
    groqKey:env.GROQ_API_KEY, groqModel:env.GROQ_MODEL || 'openai/gpt-oss-20b', groqBase:env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    accountsUrl:env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in', apiDomain:env.ZOHO_API_DOMAIN || 'https://www.zohoapis.in',
    clientId:env.ZOHO_CLIENT_ID, clientSecret:env.ZOHO_CLIENT_SECRET, refreshToken:env.ZOHO_REFRESH_TOKEN,
    webhookToken:env.ZOHO_WEBHOOK_TOKEN, channelId:env.ZOHO_CHANNEL_ID || '10001', publicUrl:env.PUBLIC_BASE_URL,
    fieldMapFile:env.ZOHO_FIELD_MAP_FILE, pipeline:env.ZOHO_PIPELINE, bookedStage:env.ZOHO_BOOKED_STAGE || 'Closed Won - Booking Done',
    paymentHosts:(env.PAYMENT_ALLOWED_HOSTS || '').split(',').map(x=>x.trim()).filter(Boolean),
    dbPath:env.DB_PATH || path.join(root,'apps/server/data/app.sqlite'), pollMs:Math.max(0,Number(env.CRM_POLL_INTERVAL_MS ?? 30000)) };
  if (!['mock','zoho'].includes(c.crmMode) || !['demo','groq'].includes(c.llmMode)) throw new Error('Invalid CRM_MODE or LLM_MODE');
  if(c.llmMode==='groq' && !c.groqKey) throw new Error('GROQ_API_KEY is required');
  if(c.crmMode==='zoho' && (!c.clientId || !c.clientSecret || !c.refreshToken)) throw new Error('Zoho client ID, secret, and refresh token are required');
  if(c.crmMode==='zoho' && c.llmMode==='demo') throw new Error('Use LLM_MODE=groq with live Zoho CRM. Demo parser is only for mock data.');
  return c;
}
