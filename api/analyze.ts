import { GoogleGenAI, Type } from '@google/genai';

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
    You are a highly precise document analysis AI. Your task is to analyze the provided certificate image and return a JSON object.

    List of Allowed College Names:
    ${collegeNames.map(name => `- ${name}`).join('\n')}

    Instructions:
    1.  **Extract:** Carefully and literally extract the full, exact name of the educational institution from the certificate. This is the most important step.
    2.  **Match:** Compare the extracted name to the "List of Allowed College Names". Find the best match from the list. Be flexible with word order (e.g., "College of Technology" should match "Technology College"). Your matching should be confident.
    3.  **Respond in JSON:** Your entire response must be a single, valid JSON object following the specified schema. Do not include any other text or markdown formatting.

    - If the image is unreadable, or you cannot confidently extract a name, return a JSON object where 'extractedName' is null.
    - If you extract a name but it does not match any name in the provided list, return a JSON object where 'matchedName' is null.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            extractedName: {
                type: Type.STRING,
                description: 'The full, literal name of the college extracted directly from the certificate image.',
                nullable: true,
            },
            matchedName: {
                type: Type.STRING,
                description: 'The name from the provided list that best matches the extracted name. Should be null if there is no confident match.',
                nullable: true,
            },
        },
        required: ['extractedName', 'matchedName'],
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
        }
    });
    
    const responseText = (response.text ?? '{}').trim();
    const result = JSON.parse(responseText);

    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error)
  {
    console.error('API /api/analyze error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during analysis.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}