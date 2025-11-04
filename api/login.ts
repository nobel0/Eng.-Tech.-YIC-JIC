
// Vercel Serverless Function
// This function will be deployed at the `/api/login` endpoint.
// It securely validates the admin password.

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(`Method ${req.method} Not Allowed`, {
      status: 405,
      headers: { 'Allow': 'POST' },
    });
  }

  const { ADMIN_PASSWORD } = process.env;

  const errorResponse = (message: string, status: number) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  if (!ADMIN_PASSWORD) {
    return errorResponse('Admin password is not configured on the server.', 500);
  }

  try {
    const { password } = await req.json();

    if (password === ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return errorResponse('Incorrect password.', 401);
    }
  } catch (error) {
    return errorResponse('Invalid request format.', 400);
  }
}
