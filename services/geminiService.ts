export const analyzeCertificate = async (
  certificateBase64: string,
  mimeType: string,
  collegeNames: string[]
): Promise<{ extractedName: string | null; matchedName: string | null; }> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ certificateBase64, mimeType, collegeNames }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Analysis failed with status: ${response.status}`);
  }

  const result = await response.json();
  return result;
};