
import { createClient } from '@vercel/kv';

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
  // Updated to use KV2_ prefix as requested
  const { 
    ADMIN_PASSWORD, 
    API_KEY, 
    KV2_KV_REST_API_URL, 
    KV2_KV_REST_API_TOKEN 
  } = process.env;

  const adminPasswordSet = !!ADMIN_PASSWORD;
  const geminiApiKeySet = !!API_KEY;
  const kvEnvVarsSet = !!(KV2_KV_REST_API_URL && KV2_KV_REST_API_TOKEN);

  let isKvConnected = false;
  let kvConnectionError: string | null = null;
  
  if (kvEnvVarsSet) {
    try {
      // Create an explicit client to test the KV2 variables
      const kv = createClient({
        url: KV2_KV_REST_API_URL!,
        token: KV2_KV_REST_API_TOKEN!,
      });
      // Test connection
      await kv.get('connection-check');
      isKvConnected = true;
    } catch (error) {
      console.error('KV Connection Check Failed:', error);
      isKvConnected = false;
      kvConnectionError = error instanceof Error ? error.message : String(error);
    }
  } else {
    kvConnectionError = "KV2 environment variables are missing. Please ensure KV2_KV_REST_API_URL and KV2_KV_REST_API_TOKEN are set.";
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
