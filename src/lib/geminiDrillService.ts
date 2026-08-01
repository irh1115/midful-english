import { GoogleGenAI, Type } from "@google/genai";
import { generateClientDrills, DrillItem } from "./drillGenerator";

export interface GenerateDrillsResult {
  drills: DrillItem[];
  source: string;
}

export async function handleGenerateDrills(sentence: string): Promise<GenerateDrillsResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log("[Drill API Info] GEMINI_API_KEY environment variable is missing. Serving local dynamic sentence parser drills.");
    const drills = generateClientDrills(sentence);
    return { drills, source: "동적 원문구조 파서 기반 Fallback" };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const drills = await generateGeminiDrillsWithRetry(ai, sentence, 2);
    return { drills, source: "AI (Gemini 3.6 Flash) 실시간 분석" };
  } catch (err: any) {
    console.error("[Drill API Error] Gemini API execution failed after retries:", {
      message: err?.message || String(err),
      code: err?.code,
      status: err?.status
    });
    console.log("[Drill API Fallback] Triggering local dynamic sentence transformation engine.");
    const drills = generateClientDrills(sentence);
    return { drills, source: "동적 원문구조 파서 기반 Fallback" };
  }
}

export async function generateGeminiDrillsWithRetry(
  ai: GoogleGenAI,
  sentence: string,
  maxRetries = 2
): Promise<DrillItem[]> {
  const prompt = `You are an expert English linguist and master language tutor specializing in sentence pattern drills.
Input sentence: "${sentence}"

STEP 1: Deeply analyze the specific syntax and grammatical essence of "${sentence}":
- What is its primary syntactic pattern? (e.g. Purpose Infinitive + Modal Necessity like "In order for X to Y, Z must be present"; Imperative + Indirect Question / Noun Clause like "Remember who you are"; Copula/Possessive Complement like "You're my person"; Gerund Subject like "Believing in yourself..."; Conditional Clause like "If you want..."; Dummy Subject "It is ~ to ..."; Relative Clause "People who..."; Infinitive Purpose "To master...", etc.)
- What is its core semantic focus or key vocabulary?

STEP 2: Generate exactly 5 brand new, completely distinct English practice sentences that DIRECTLY PRACTICE AND REINFORCE this exact grammatical structure or key syntax!

STRICT RULES:
1. DO NOT use generic boilerplate templates. Every drill set MUST be customized specifically for the unique grammatical structure of "${sentence}".
2. Preserve or match the syntactic frame of "${sentence}".
3. Every generated English sentence MUST be 100% grammatically natural, complete, correct, and inspiring.
4. ABSOLUTE ZERO DEFECT RULE: Never insert raw contractions like "you're", "it's", or "don't" as noun phrases into pre-made slots. Every single sentence must be crafted from scratch with native-speaker precision.
5. Provide a polite Korean translation ("translation") and a clear, informative Korean explanation ("hint") describing the grammatical pattern being practiced.
6. Provide "scramble": an array of the sentence's words in randomized order for a word-order arrangement quiz.

Return ONLY a strict JSON array of 5 objects conforming to:
[
  {
    "text": "Complete English sentence",
    "translation": "자연스러운 한국어 번역",
    "hint": "🔑 한국어 문법 패턴 설명 (예: 목적 부사구 + 필수 조동사 구문 연습)",
    "scramble": ["word1", "word2", ...]
  },
  ...
]`;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[Drill API] Gemini API request attempt ${attempt}/${maxRetries + 1} for: "${sentence.slice(0, 45)}..."`);

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                translation: { type: Type.STRING },
                hint: { type: Type.STRING },
                scramble: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["text", "translation", "hint", "scramble"]
            }
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini API returned an empty response text.");
      }

      const drills = JSON.parse(responseText.trim());
      if (Array.isArray(drills) && drills.length > 0) {
        console.log(`[Drill API Success] Successfully generated ${drills.length} drills via Gemini 3.6 Flash on attempt ${attempt}.`);
        return drills;
      } else {
        throw new Error("Gemini API response is not a valid non-empty array.");
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Drill API Warning] Attempt ${attempt} failed: ${err?.message || String(err)}`);
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
      }
    }
  }

  throw lastError || new Error("All Gemini API attempts failed.");
}
