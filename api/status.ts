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

  const { ADMIN_PASSWORD, API_KEY } = process.env;

  const adminPasswordSet = !!ADMIN_PASSWORD;
  const geminiApiKeySet = !!API_KEY;

  let isKvConnected = false;
  let kvConnectionError: string | null = null;
  
  try {
    // This will throw an error if the required KV_... env vars are not set.
    // A simple `info` command acts as a connection test.
    await kv.info();
    isKvConnected = true;
  } catch (error) {
    console.error('KV Connection Check Failed:', error);
    isKvConnected = false;
    kvConnectionError = error instanceof Error ? error.message : String(error);
  }


  const status = {
    kvStoreConnected: isKvConnected,
    adminPasswordSet,
    geminiApiKeySet,
    kvConnectionError, // Pass the specific error message to the frontend
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}