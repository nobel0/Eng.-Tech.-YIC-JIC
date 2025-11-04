// Vercel Serverless Function
// This function will be deployed at the `/api/settings` endpoint.
// It uses Vercel's KV (Key-Value) store to persist settings.

// This file is TypeScript, but we use require for Node.js compatibility in serverless envs.
// No external dependencies are needed, it uses the native fetch API.

export const config = {
  runtime: 'edge', // Using the Edge runtime for performance
};

export default async function handler(req: Request) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  const errorResponse = (message: string, status: number) => {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return errorResponse('KV environment variables are not set. Please create a Vercel KV store and link it to your project.', 500);
  }

  const authHeader = { Authorization: `Bearer ${KV_REST_API_TOKEN}` };

  if (req.method === 'GET') {
    try {
      const response = await fetch(`${KV_REST_API_URL}/get/settings`, { headers: authHeader });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch settings from KV: ${response.status} ${errText}`);
      }
      const data = await response.json();
      // The result from KV is a string, so we need to parse it.
      const settings = data.result ? JSON.parse(data.result) : null;
      return new Response(JSON.stringify(settings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('GET /api/settings error:', error);
      return errorResponse(error.message, 500);
    }
  } else if (req.method === 'POST') {
    try {
      const settings = await req.json();
      const response = await fetch(`${KV_REST_API_URL}/set/settings`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to save settings to KV: ${response.status} ${errText}`);
      }

      return new Response(JSON.stringify({ message: 'Settings saved successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('POST /api/settings error:', error);
      return errorResponse(error.message, 500);
    }
  } else {
    return new Response(`Method ${req.method} Not Allowed`, {
      status: 405,
      headers: { 'Allow': 'GET, POST' },
    });
  }
}