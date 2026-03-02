import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  EXTRACTION_SYSTEM_PROMPT, 
  GENERATION_SYSTEM_PROMPT, 
  REFINEMENT_SYSTEM_PROMPT,
  getExtractionPrompt,
  getGenerationPrompt,
  getRefinementPrompt
} from "./llm-prompts";

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
console.log("Gemini API Key Status:", apiKey ? `Present (starts with ${apiKey.substring(0, 5)}...)` : "Missing");

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Models configuration
// Try experimental 2.0 flash model
const PRIMARY_MODEL = "gemini-2.0-flash-exp";
// Fallback to 1.5 pro if available
const BACKUP_MODEL = "gemini-1.5-pro"; 

// Helper to clean JSON response from LLM
function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/^```json\n|\n```$/g, "").replace(/^```\n|\n```$/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  return cleaned;
}

// Helper to call Gemini API with retry logic
async function callGeminiWithFallback(
  prompt: string,
  systemPrompt: string,
  maxRetries = 2
): Promise<any> {
  if (!genAI) throw new Error("Gemini API Key not configured");

  // Try Primary Model
  try {
    console.log(`Attempting to generate with model: ${PRIMARY_MODEL}`);
    const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
    
    // Add timeout race (25s)
    const result = await Promise.race([
      model.generateContent({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: prompt }] }
        ],
        generationConfig: { responseMimeType: "application/json" }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000))
    ]) as any;

    return result;
  } catch (error: any) {
    console.warn(`Primary model (${PRIMARY_MODEL}) failed:`, error.message);

    // If error, try backup model
    if (error.message === "Timeout" || error.message?.includes("404") || error.message?.includes("503") || error.message?.includes("fetch")) {
      console.log(`Retrying with model: ${BACKUP_MODEL}`);
      const backupModel = genAI.getGenerativeModel({ model: BACKUP_MODEL });
      
      return await backupModel.generateContent({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: prompt }] }
        ],
        generationConfig: { responseMimeType: "application/json" }
      });
    }
    throw error;
  }
}

/**
 * 解析使用者輸入，提取旅遊偏好
 */
export async function extractTravelPreferences(userInput: string, currentContext?: any) {
  if (!genAI) return null;

  try {
    const prompt = getExtractionPrompt(userInput, currentContext);
    const result = await callGeminiWithFallback(prompt, EXTRACTION_SYSTEM_PROMPT);
    const responseText = result.response.text();
    console.log("Gemini extraction raw response:", responseText);
    return JSON.parse(cleanJsonResponse(responseText));
  } catch (error: any) {
    console.error("Error calling Gemini API (extraction):", error.message);
    return null;
  }
}

/**
 * 根據偏好生成行程
 */
export async function generateItinerary(preferences: {
  country: string;
  days: string;
  budget?: string;
  themes?: string;
  month?: string;
}) {
  if (!genAI) return null;

  try {
    const prompt = getGenerationPrompt(preferences);
    const result = await callGeminiWithFallback(prompt, GENERATION_SYSTEM_PROMPT);
    const responseText = result.response.text();
    console.log("Gemini generation raw response:", responseText);
    return JSON.parse(cleanJsonResponse(responseText));
  } catch (error: any) {
    console.error("Error calling Gemini API (generation):", error.message);
    return null;
  }
}

/**
 * 根據使用者回饋微調行程
 */
export async function refineItinerary(currentItinerary: any, userFeedback: string) {
  if (!genAI) return null;

  try {
    const prompt = getRefinementPrompt(currentItinerary, userFeedback);
    const result = await callGeminiWithFallback(prompt, REFINEMENT_SYSTEM_PROMPT);
    const responseText = result.response.text();
    return JSON.parse(cleanJsonResponse(responseText));
  } catch (error: any) {
    console.error("Error calling Gemini API (refinement):", error.message);
    return null;
  }
}
