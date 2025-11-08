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
    Analyze the text in this graduation certificate document. Identify the name of the college or university. 
    From the following list of colleges, which one is mentioned in the certificate? 
    
    Respond with ONLY the name of the college from the provided list if you find a match. 
    If you don't find a clear match from the list, respond with "NOMATCH".

    List of colleges:
    ${collegeNames.map(name => `- ${name}`).join('\n')}

    Do not add any other explanation or text. Your response should be just the college name from the list or the word "NOMATCH".
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
    });
    
    const resultText = response.text.trim();
    
    const matchedName = (resultText && resultText.toUpperCase() !== 'NOMATCH') ? resultText : null;

    return new Response(JSON.stringify({ matchedName }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error)
  {
    console.error('API /api/analyze error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during analysis.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}