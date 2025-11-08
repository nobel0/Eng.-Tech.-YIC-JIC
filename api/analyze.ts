import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  if (!process.env.API_KEY) {
    return new Response(JSON.stringify({ error: 'API_KEY not configured on server' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { certificateBase64, mimeType, collegeNames } = await req.json();

    if (!certificateBase64 || !mimeType || !Array.isArray(collegeNames)) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = fileToGenerativePart(certificateBase64, mimeType);

    const prompt = `
    You are an expert document analyzer. Your task is to strictly identify the name of the college or university from the provided graduation certificate image.

    From the provided list, find the exact match for the institution named in the certificate.

    **List of recognized colleges:**
    ${collegeNames.map(name => `- ${name}`).join('\n')}

    **Strict Matching Rules:**
    1. Only return a name from the list if it is explicitly and clearly written on the certificate. Do not infer or guess.
    2. For "Yanbu Industrial College" or "Jubail Industrial College", the certificate MUST contain the full phrase "Yanbu Industrial College" or "Jubail Industrial College".
    3. For any college named "Technical College", the certificate MUST contain the explicit phrase "Technical College".
    4. If the certificate mentions a college that is NOT on the list, you MUST respond with "NOMATCH".
    5. If the image is unclear, unreadable, or not a certificate, you MUST respond with "NOMATCH".

    Your response MUST be ONLY the full name of the college from the list if a match is found according to these rules. Otherwise, your response MUST be the single word "NOMATCH". Do not add any explanation.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
    });
    
    const resultText = (response.text ?? '').trim();
    
    const matchedName = (resultText && resultText.toUpperCase() !== 'NOMATCH') ? resultText : null;

    return new Response(JSON.stringify({ matchedName }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error)
  {
    console.error('API /api/analyze error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during analysis.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}