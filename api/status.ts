// Vercel Serverless Function
// Path: /api/status
// Checks for the presence of all required server-side environment variables.
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

  let isKvConnected = false;
  try {
    // Perform a harmless, lightweight operation to truly check connectivity.
    // The 'ping' command is ideal as it's a simple round-trip check.
    // If this doesn't throw an error, the connection is valid.
    await kv.ping();
    isKvConnected = true;
  } catch (error) {
    // Any error during the ping (e.g., connection refused, auth failed)
    // indicates the KV store is not properly configured or accessible.
    console.error('KV Connection Check Failed:', error);
    isKvConnected = false;
  }

  const { ADMIN_PASSWORD, API_KEY } = process.env;

  const status = {
    kvStoreConnected: isKvConnected,
    adminPasswordSet: !!ADMIN_PASSWORD,
    geminiApiKeySet: !!API_KEY,
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
