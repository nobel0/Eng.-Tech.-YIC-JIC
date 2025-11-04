// Vercel Serverless Function
// This function will be deployed at the `/api/submissions` endpoint.
// It manages the list of submissions in the Vercel KV store.

import type { Submission } from '../types';

export const config = {
  runtime: 'edge',
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
    return errorResponse('KV environment variables are not set.', 500);
  }

  const authHeader = { Authorization: `Bearer ${KV_REST_API_TOKEN}` };
  const SUBMISSIONS_KEY = 'submissions';

  const getSubmissions = async (): Promise<Submission[]> => {
    const res = await fetch(`${KV_REST_API_URL}/get/${SUBMISSIONS_KEY}`, { headers: authHeader });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch submissions from KV: ${res.status} ${errText}`);
    }
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : [];
  };

  if (req.method === 'GET') {
    try {
      const submissions = await getSubmissions();
      return new Response(JSON.stringify(submissions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('GET /api/submissions error:', error);
      return errorResponse(error.message, 500);
    }
  } else if (req.method === 'POST') {
    try {
      const newSubmission: Submission = await req.json();
      const existingSubmissions = await getSubmissions();
      const updatedSubmissions = [newSubmission, ...existingSubmissions];
      
      const response = await fetch(`${KV_REST_API_URL}/set/${SUBMISSIONS_KEY}`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(updatedSubmissions),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to save submission to KV: ${response.status} ${errText}`);
      }

      return new Response(JSON.stringify({ message: 'Submission saved.' }), { status: 201 });
    } catch (error) {
      console.error('POST /api/submissions error:', error);
      return errorResponse(error.message, 500);
    }
  } else if (req.method === 'DELETE') {
    try {
        const response = await fetch(`${KV_REST_API_URL}/del/${SUBMISSIONS_KEY}`, {
            method: 'POST', // Vercel KV REST API uses POST for DEL command via HTTP
            headers: authHeader,
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to delete submissions from KV: ${response.status} ${errText}`);
        }

        return new Response(JSON.stringify({ message: 'Submissions cleared.' }), { status: 200 });
    } catch (error) {
        console.error('DELETE /api/submissions error:', error);
        return errorResponse(error.message, 500);
    }
  } else {
    return new Response(`Method ${req.method} Not Allowed`, {
      status: 405,
      headers: { 'Allow': 'GET, POST, DELETE' },
    });
  }
}