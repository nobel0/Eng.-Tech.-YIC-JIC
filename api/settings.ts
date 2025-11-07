// Vercel Serverless Function
// This function will be deployed at the `/api/settings` endpoint.
// It uses Vercel's KV (Key-Value) store to persist settings.

import { createClient, VercelKV } from '@vercel/kv';

export const config = {
  runtime: 'edge', // Using the Edge runtime for performance
};

// This function creates the DB client, supporting both Vercel KV and Vercel Redis.
function getDbClient(): VercelKV {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // For Vercel Redis, the variables from Upstash are used.
    return createClient({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else {
    // If neither is found, we cannot connect to a database.
    throw new Error('Database connection variables are not set. Please connect a Vercel KV or Redis store.');
  }
}

export default async function handler(req: Request) {
  const errorResponse = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const kv = getDbClient(); // Get a configured client instance.

    if (req.method === 'GET') {
      const settings = await kv.get('settings');
      return new Response(JSON.stringify(settings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (req.method === 'POST') {
      const settings = await req.json();
      await kv.set('settings', settings);

      return new Response(JSON.stringify({ message: 'Settings saved successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(`Method ${req.method} Not Allowed`, {
        status: 405,
        headers: { 'Allow': 'GET, POST' },
      });
    }
  } catch (error) {
    console.error('API /api/settings error:', error);
    // Provide a clear, user-facing error message for connection issues.
    return errorResponse(
      `Database connection failed. ${error.message} Please ensure your Vercel project has a KV or Redis store connected and the environment variables are available. After connecting, a new deployment is required.`, 
      500
    );
  }
}