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
    // The @vercel/kv library will throw an error if not configured.
    // We can catch it and return a user-friendly message.
    if (error.message && (error.message.includes('Missing required') || error.message.includes('invalid URL'))) {
      return errorResponse('KV environment variables are not set correctly. Please check your Vercel project settings.', 500);
    }
    return errorResponse(error.message, 500);
  }
}
