
import { GoogleGenAI } from "@google/genai";

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export const analyzeCertificate = async (
  certificateBase64: string,
  mimeType: string,
  collegeNames: string[]
): Promise<string | null> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const filePart = fileToGenerativePart(certificateBase64, mimeType);

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
        contents: { parts: [filePart, { text: prompt }] },
    });
    
    const resultText = response.text.trim();

    if (resultText && resultText.toUpperCase() !== 'NOMATCH') {
      return resultText;
    }

    return null;
};
