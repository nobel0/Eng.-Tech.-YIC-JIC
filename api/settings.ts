// Vercel Serverless Function
// This function will be deployed at the `/api/settings` endpoint.
// It uses Vercel's KV (Key-Value) store to persist settings.

// NOTE: We are NOT importing `kv` at the top level.
// This is to prevent the server from crashing during local development
// if the Vercel KV environment variables haven't been set up yet.

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

  // Pre-flight check: Ensure KV environment variables exist before proceeding.
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return errorResponse(
        'Database not configured. Please follow the setup instructions in the Admin Panel.',
        503 // 503 Service Unavailable is appropriate here.
    );
  }

  try {
    // Dynamically import `kv` now that we know the environment variables are set.
    const { kv } = await import('@vercel/kv');

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
    // Provide a more detailed, user-facing error message.
    return errorResponse(
      `An error occurred while communicating with the database. Details: ${errorMessage}. This could be a connection issue, or the data being saved might be too large (e.g., a large logo image exceeds the 1MB limit). Please check your Vercel KV store connection and try again.`, 
      500
    );
  }
}