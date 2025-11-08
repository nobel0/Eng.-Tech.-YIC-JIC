// Vercel Serverless Function
// This function will be deployed at the `/api/submissions` endpoint.
// It manages the list of submissions in the Vercel KV store.

// NOTE: We are NOT importing `kv` at the top level.
// This is to prevent the server from crashing during local development
// if the Vercel KV environment variables haven't been set up yet.

import type { Submission } from './types';

export const config = {
  runtime: 'edge',
};

const SUBMISSIONS_KEY = 'submissions';

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
      // FIX: Cast the result of kv.get instead of using a generic type argument
      // to avoid "Untyped function calls may not accept type arguments" error.
      const submissions = (await kv.get(SUBMISSIONS_KEY)) as Submission[] || [];
      return new Response(JSON.stringify(submissions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (req.method === 'POST') {
      const newSubmission: Submission = await req.json();
      // FIX: Cast the result of kv.get instead of using a generic type argument
      // to avoid "Untyped function calls may not accept type arguments" error.
      const existingSubmissions = (await kv.get(SUBMISSIONS_KEY)) as Submission[] || [];
      const updatedSubmissions = [newSubmission, ...existingSubmissions];
      
      await kv.set(SUBMISSIONS_KEY, updatedSubmissions);

      return new Response(JSON.stringify({ message: 'Submission saved.' }), { status: 201 });
    } else if (req.method === 'DELETE') {
        await kv.del(SUBMISSIONS_KEY);
        return new Response(JSON.stringify({ message: 'Submissions cleared.' }), { status: 200 });
    } else {
      return new Response(`Method ${req.method} Not Allowed`, {
        status: 405,
        headers: { 'Allow': 'GET, POST, DELETE' },
      });
    }
  } catch (error) {
    console.error('API /api/submissions error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
     // Provide a clearer, user-facing error message.
    return errorResponse(
      `An error occurred while communicating with the database. Details: ${errorMessage}. Please check your Vercel KV store connection and that the environment variables are correctly configured.`,
      500
    );
  }
}