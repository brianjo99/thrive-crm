import { AccessError, corsHeaders, jsonResponse, requireInternalUser } from "../_shared/security.ts";

type GeminiResponse = {
  error?: { message?: string };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function textField(body: Record<string, unknown>, key: string, maxLength = 500) {
  const value = body[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  try {
    await requireInternalUser(req);
    const body = await req.json() as Record<string, unknown>;
    const tipo = textField(body, "tipo", 120);
    const tono = textField(body, "tono", 120);
    const descripcion = textField(body, "descripcion", 1600);
    const duracion = textField(body, "duracion", 80);
    const plataforma = textField(body, "plataforma", 120);
    const campaignName = textField(body, "campaignName", 120);
    const clientName = textField(body, "clientName", 120);
    if (!descripcion) return jsonResponse(req, { error: "Description required" }, 400);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const prompt = `Eres un experto copywriter y director creativo de una agencia de marketing digital llamada Thrive Agency.

Crea un script profesional con la siguiente información:
- Plataforma: ${plataforma || "Instagram Reel"}
- Tipo de contenido: ${tipo || "Promocional"}
- Tono: ${tono || "Profesional y cercano"}
- Duración aproximada: ${duracion || "60 segundos"}
- Cliente/Marca: ${clientName || "Sin especificar"}
- Campaña: ${campaignName || "Sin especificar"}
- Descripción / Contexto: ${descripcion}

Formato del script:
- Divide el script en escenas o tomas numeradas
- Incluye: [VISUAL] para indicar qué se ve en cámara, [AUDIO/VOZ] para el guión hablado, [TEXTO EN PANTALLA] si aplica
- Al final incluye un CTA (llamada a la acción) claro
- Usa el idioma español
- Sé específico, creativo y alineado con tendencias actuales de contenido digital

Escribe SOLO el script, sin explicaciones adicionales.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
        }),
      }
    );

    const data = await response.json() as GeminiResponse;
    if (!response.ok) throw new Error(data.error?.message || "Gemini API error");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No content generated");

    return jsonResponse(req, { script: text });
  } catch (error: unknown) {
    const status = error instanceof AccessError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(req, { error: message }, status);
  }
});
