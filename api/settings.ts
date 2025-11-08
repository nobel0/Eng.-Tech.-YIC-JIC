// Vercel Serverless Function
// This function will be deployed at the `/api/settings` endpoint.
// It uses Vercel's KV (Key-Value) store to persist settings.

import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge', // Using the Edge runtime for performance
};

export default async function handler(req: Request) {
  const errorResponse = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    // The `kv` object from `@vercel/kv` is automatically configured by Vercel.
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Provide a clear, user-facing error message for connection issues.
    return errorResponse(
      `Database connection failed. Details: ${errorMessage}. Please ensure your Vercel project has a KV store connected and the environment variables are available. After connecting, a new deployment is required.`, 
      500
    );
  }
}