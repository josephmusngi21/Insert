export type ReceiptOcrResult = {
  text: string;
  raw: unknown;
};

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

const getOcrSpaceApiKey = (): string => {
  // Use EXPO_PUBLIC_OCR_SPACE_API_KEY in app config for production.
  return process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || "helloworld";
};

const getFileNameFromUri = (uri: string): string => {
  const parts = uri.split("/");
  return parts[parts.length - 1] || `receipt-${Date.now()}.jpg`;
};

export const extractReceiptTextFromImage = async (imageUri: string): Promise<ReceiptOcrResult> => {
  if (!imageUri) {
    throw new Error("Missing receipt image URI");
  }

  const formData = new FormData();
  formData.append("apikey", getOcrSpaceApiKey());
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("scale", "true");
  formData.append("OCREngine", "2");
  formData.append("file", {
    uri: imageUri,
    name: getFileNameFromUri(imageUri),
    type: "image/jpeg",
  } as unknown as Blob);

  const response = await fetch(OCR_SPACE_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const parsedResults = Array.isArray(payload?.ParsedResults) ? payload.ParsedResults : [];
  const text = parsedResults
    .map((entry: { ParsedText?: string }) => entry?.ParsedText || "")
    .join("\n")
    .trim();

  if (!text) {
    const errMsg = payload?.ErrorMessage || payload?.ErrorDetails || "No text found in receipt image";
    throw new Error(Array.isArray(errMsg) ? errMsg.join(" ") : String(errMsg));
  }

  return {
    text,
    raw: payload,
  };
};
