// ============================================================================
// Blood smear malaria vision inference
// ----------------------------------------------------------------------------
// Calls the MobileNetV2 classifier (fine-tuned on NIH malaria dataset,
// 92% validation accuracy) hosted on Hugging Face Spaces, plus Claude for
// optional developmental-stage identification.
// ============================================================================

const HF_SPACE_URL = "https://nishantjain12345-malaria-detector.hf.space";
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export interface SmearResult {
  parasitized: number;
  uninfected: number;
  verdict: "parasitized" | "uninfected";
  confidencePercent: number;
  error?: string;
}

export interface StageResult {
  stage: "ring" | "trophozoite" | "schizont" | "gametocyte" | "none" | "unknown";
  reasoning: string;
  error?: string;
}

async function imageToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function analyzeSmear(imageUri: string): Promise<SmearResult> {
  try {
    const dataUrl = await imageToBase64(imageUri);
    const initRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{ url: dataUrl, meta: { _type: "gradio.FileData" } }],
      }),
    });
    if (!initRes.ok) {
      return {
        parasitized: 0,
        uninfected: 0,
        verdict: "uninfected",
        confidencePercent: 0,
        error: `Model unreachable: HTTP ${initRes.status}`,
      };
    }
    const { event_id } = await initRes.json();
    if (!event_id) {
      return {
        parasitized: 0,
        uninfected: 0,
        verdict: "uninfected",
        confidencePercent: 0,
        error: "No event_id",
      };
    }
    const resultRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
    const text = await resultRes.text();
    const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
    if (!dataLine) {
      return {
        parasitized: 0,
        uninfected: 0,
        verdict: "uninfected",
        confidencePercent: 0,
        error: "No data in response",
      };
    }
    const payload = JSON.parse(dataLine.slice(6));
    const out = Array.isArray(payload) ? payload[0] : payload;
    const confidences: { label: string; confidence: number }[] = out?.confidences ?? [];
    const parasit = confidences.find((c) => c.label === "Parasitized")?.confidence ?? 0;
    const uninf = confidences.find((c) => c.label === "Uninfected")?.confidence ?? 0;
    const verdict: "parasitized" | "uninfected" = parasit >= 0.5 ? "parasitized" : "uninfected";
    const confidencePercent = Math.round((verdict === "parasitized" ? parasit : uninf) * 100);
    return { parasitized: parasit, uninfected: uninf, verdict, confidencePercent };
  } catch (e) {
    return {
      parasitized: 0,
      uninfected: 0,
      verdict: "uninfected",
      confidencePercent: 0,
      error: (e as Error).message ?? "Network error",
    };
  }
}

export async function analyzeStage(imageUri: string): Promise<StageResult> {
  if (!ANTHROPIC_API_KEY) {
    return { stage: "unknown", reasoning: "", error: "No Anthropic key set" };
  }
  try {
    const dataUrl = await imageToBase64(imageUri);
    const base64 = dataUrl.split(",")[1];
    const mediaType = dataUrl.split(";")[0].replace("data:", "");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              {
                type: "text",
                text: "Identify the most likely Plasmodium developmental stage in this thin blood smear: ring, trophozoite, schizont, gametocyte, or none. Return ONLY JSON: {\"stage\": \"...\", \"reasoning\": \"one sentence\"}",
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { stage: "unknown", reasoning: "", error: `Claude API ${res.status}` };
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { stage: parsed.stage ?? "unknown", reasoning: parsed.reasoning ?? "" };
  } catch (e) {
    return { stage: "unknown", reasoning: "", error: (e as Error).message ?? "Error" };
  }
}
