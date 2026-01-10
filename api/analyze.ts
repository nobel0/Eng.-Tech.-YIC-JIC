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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API_KEY not configured on server' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { certificateBase64, mimeType, collegeNames } = await req.json();

    if (!certificateBase64 || !mimeType || !Array.isArray(collegeNames)) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
    }

    const ai = new GoogleGenAI({ apiKey });
    const imagePart = fileToGenerativePart(certificateBase64, mimeType);

    const prompt = `
    You are a highly precise document analysis AI. Your task is to analyze the provided certificate image and return a JSON object.

    List of Allowed College Names:
    ${collegeNames.map(name => `- ${name}`).join('\n')}

    Instructions:
    1.  **Extract:** Literally extract the educational institution name.
    2.  **Match:** Find the closest match from the provided list.
    3.  **Strict Output:** Return only valid JSON.

    Return null for values that cannot be identified.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            extractedName: {
                type: Type.STRING,
                description: 'The institution name extracted from the certificate.',
                nullable: true,
            },
            matchedName: {
                type: Type.STRING,
                description: 'The matching name from the allowed list.',
                nullable: true,
            },
        },
        required: ['extractedName', 'matchedName'],
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
        }
    });
    
    // Accessing .text property directly as per latest SDK guidelines
    const responseText = response.text?.trim() ?? '{}';
    const result = JSON.parse(responseText);

    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('API /api/analyze error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Analysis failed due to a server error' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}