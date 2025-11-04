
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
    ADMIN_PASSWORD,
    API_KEY,
  } = process.env;

  const status = {
    kvStoreConnected: !!(KV_REST_API_URL && KV_REST_API_TOKEN),
    adminPasswordSet: !!ADMIN_PASSWORD,
    geminiApiKeySet: !!API_KEY,
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
