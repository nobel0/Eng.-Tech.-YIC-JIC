import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(`Method ${req.method} Not Allowed`, {
      status: 405,
      headers: { 'Allow': 'GET' },
    });
  }

  // Check env vars first without calling KV to avoid initialization crashes
  const { 
    ADMIN_PASSWORD, 
    API_KEY, 
    KV_REST_API_URL, 
    KV_REST_API_TOKEN 
  } = process.env;

  const adminPasswordSet = !!ADMIN_PASSWORD;
  const geminiApiKeySet = !!API_KEY;
  const kvEnvVarsSet = !!(KV_REST_API_URL && KV_REST_API_TOKEN);

  let isKvConnected = false;
  let kvConnectionError: string | null = null;
  
  if (kvEnvVarsSet) {
    try {
      // Test connection only if vars exist
      await kv.get('connection-check');
      isKvConnected = true;
    } catch (error) {
      console.error('KV Connection Check Failed:', error);
      isKvConnected = false;
      kvConnectionError = error instanceof Error ? error.message : String(error);
    }
  } else {
    kvConnectionError = "KV environment variables are missing. The database may have been archived or deleted.";
  }

  const status = {
    kvStoreConnected: isKvConnected,
    adminPasswordSet,
    geminiApiKeySet,
    kvConnectionError,
    kvEnvVarsSet
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}