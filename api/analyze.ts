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
    You are a highly precise document analysis AI. Your single task is to identify which of the following college names appears on the provided certificate image.

    **List of Allowed Names:**
    ${collegeNames.map(name => `- ${name}`).join('\n')}

    **Instructions & Rules:**
    1.  **Analyze the certificate:** Carefully read the text on the certificate image.
    2.  **Find an Exact Match:** Compare the text to the "List of Allowed Names". You must find an exact, word-for-word match.
    3.  **Strict "Technical College" Rule:** If a name in the list includes "Technical College", the certificate must explicitly contain the words "Technical College".
    4.  **Strict "Industrial College" Rule:** If a name in the list is "Yanbu Industrial College" or "Jubail Industrial College", the certificate must contain that exact full phrase.
    5.  **Output Format:**
        - If you find an exact match from the list, your response MUST be ONLY that exact name and nothing else.
        - If there is no exact match, or the name is for a different college not on the list, or the image is unreadable, your response MUST be the single word "NOMATCH".

    **Example Response if Matched:**
    Yanbu Industrial College

    **Example Response if Not Matched:**
    NOMATCH

    Do not provide any commentary, explanation, or extra text. Your entire response must be either a single name from the list or the word "NOMATCH".
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
    });
    
    const resultText = (response.text ?? '').trim();
    
    let matchedName: string | null = null;

    if (resultText && resultText.toUpperCase() !== 'NOMATCH') {
        // Sort colleges by length, longest first, to prioritize more specific matches.
        // e.g., "King Fahd University of Petroleum and Minerals" before "King Fahd University"
        const sortedColleges = [...collegeNames].sort((a, b) => b.length - a.length);

        // Find the first college name that is contained within the AI's response.
        // This makes the matching robust against extra words or punctuation from the AI.
        const foundCollege = sortedColleges.find(name => 
            resultText.toLowerCase().includes(name.toLowerCase())
        );
        
        // If a college name from our list is found inside the AI response, use that.
        // Otherwise, we can't be sure, so we treat it as no match.
        matchedName = foundCollege || null;
    }

    return new Response(JSON.stringify({ matchedName }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error)
  {
    console.error('API /api/analyze error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during analysis.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}