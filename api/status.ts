// Vercel Serverless Function
// Path: /api/status
// Checks for the presence of all required server-side environment variables.

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

  // First, check if the required environment variables for KV exist.
  // If they don't, we can't (and shouldn't) try to use the @vercel/kv package,
  // as its initialization will throw an error.
  if (KV_REST_API_URL && KV_REST_API_TOKEN) {
    try {
      // The variables exist, now let's try to connect and ping.
      // We dynamically import the package *inside* this check to prevent
      // a module-level error when the env vars are missing.
      const { kv } = await import('@vercel/kv');
      await kv.ping();
      isKvConnected = true;
    } catch (error) {
      // This will catch actual connection errors (e.g., wrong tokens, network issues)
      // because we already know the env vars are set.
      console.error('KV Connection Ping Failed:', error);
      isKvConnected = false;
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