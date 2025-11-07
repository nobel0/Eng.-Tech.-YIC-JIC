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

  const {
    KV_REST_API_URL,
    KV_REST_API_TOKEN,
    UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN,
    ADMIN_PASSWORD,
    API_KEY,
  } = process.env;

  const status = {
    // A valid connection exists if either the KV variables OR the Redis (Upstash) variables are present.
    kvStoreConnected: !!((KV_REST_API_URL && KV_REST_API_TOKEN) || (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)),
    adminPasswordSet: !!ADMIN_PASSWORD,
    geminiApiKeySet: !!API_KEY,
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}