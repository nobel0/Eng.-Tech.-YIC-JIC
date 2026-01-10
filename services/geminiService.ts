
import { GoogleGenAI, Type } from '@google/genai';

export const analyzeCertificate = async (
  certificateBase64: string,
  mimeType: string,
  collegeNames: string[]
): Promise<{ extractedName: string | null; matchedName: string | null; }> => {
  
  // Try calling the backend API first
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificateBase64, mimeType, collegeNames }),
    });

    if (response.ok) {
      return await response.json();
    }
    
    // If not found or failed, we might be in frontend-only mode
    if (response.status !== 404) {
       const errorData = await response.json();
       throw new Error(errorData.error || `Analysis failed with status: ${response.status}`);
    }
  } catch (e) {
    console.warn("Backend API unavailable, falling back to direct client-side Gemini call.", e);
  }

  // Fallback: Use Gemini SDK directly in the browser if backend is unavailable
  // The system instruction assumes process.env.API_KEY is available.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key is not configured. Please set the API_KEY environment variable.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Analyze the provided certificate image.
    Allowed College Names:
    ${collegeNames.map(name => `- ${name}`).join('\n')}

    1. Extract the institution name exactly as it appears.
    2. Find the closest match from the allowed list.
    3. Return a JSON object with 'extractedName' and 'matchedName'.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: certificateBase64, mimeType } }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          extractedName: { type: Type.STRING, nullable: true },
          matchedName: { type: Type.STRING, nullable: true },
        },
        required: ['extractedName', 'matchedName'],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini API");
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Invalid response format from AI.");
  }
};
