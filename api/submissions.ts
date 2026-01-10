import { kv } from '@vercel/kv';
import type { Submission } from './types';

export const config = {
  runtime: 'edge',
};

const SUBMISSIONS_KEY = 'submissions';

export default async function handler(req: Request) {
  try {
    if (req.method === 'GET') {
      const submissions = await kv.get<Submission[]>(SUBMISSIONS_KEY) || [];
      return new Response(JSON.stringify(submissions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (req.method === 'POST') {
      const newSubmission: Submission = await req.json();
      const existingSubmissions = await kv.get<Submission[]>(SUBMISSIONS_KEY) || [];
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
    return new Response(JSON.stringify({ error: `An error occurred with the database: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}