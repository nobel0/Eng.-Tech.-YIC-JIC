// Vercel Serverless Function
// Path: /api/status
// Checks for the presence of all required server-side environment variables and pings the KV store.

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

  const { ADMIN_PASSWORD, API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  const adminPasswordSet = !!ADMIN_PASSWORD;
  const geminiApiKeySet = !!API_KEY;

  let isKvConnected = false;
  // Only attempt to connect to KV if the environment variables are present.
  // This prevents the app from crashing on local startup if .env is not set up.
  if (KV_REST_API_URL && KV_REST_API_TOKEN) {
    try {
      // Dynamically import kv to avoid initialization errors when env vars are missing.
      const { kv } = await import('@vercel/kv');
      // This will attempt a 'ping' command to the database.
      await kv.ping();
      isKvConnected = true;
    } catch (error) {
      // We log the specific error for server-side debugging but just report 'false' to the client.
      console.error('KV Connection Check Failed:', error);
      isKvConnected = false; // Explicitly set to false on error.
    }
  }

  const status = {
    kvStoreConnected: isKvConnected,
    adminPasswordSet,
    geminiApiKeySet,
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}