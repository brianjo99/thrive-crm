import { AccessError, corsHeaders, jsonResponse, requireInternalUser } from "../_shared/security.ts";

type GeminiResponse = {
  error?: { message?: string };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
    }),
  });
  const data = await res.json() as GeminiResponse;
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content generated");
  return text;
}

function textField(body: Record<string, unknown>, key: string, maxLength = 500) {
  const value = body[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseStringRecord(raw: string): Record<string, string> {
  const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid AI response");
  const record = parsed as Record<string, unknown>;
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  try {
    await requireInternalUser(req);
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const body = await req.json() as Record<string, unknown>;
    const type = textField(body, "type", 30);

    let result: Record<string, string> = {};

    if (type === "campaign") {
      const clientName = textField(body, "clientName", 120);
      const industry = textField(body, "industry", 120);
      const objetivo = textField(body, "objetivo", 800);
      const presupuesto = textField(body, "presupuesto", 100);
      const plataformas = textField(body, "plataformas", 200);
      const prompt = `Eres un estratega de marketing digital de una agencia llamada Thrive Agency.

Crea una propuesta de campaña para este cliente:
- Cliente: ${clientName || "Sin especificar"}
- Industria: ${industry || "Sin especificar"}
- Objetivo: ${objetivo || "Sin especificar"}
- Presupuesto aproximado: ${presupuesto || "Sin especificar"}
- Plataformas: ${plataformas || "Instagram, TikTok"}

Responde en formato JSON válido con exactamente estas claves:
{
  "name": "nombre creativo de la campaña (máx 60 chars)",
  "description": "descripción estratégica de 2-3 oraciones",
  "strategy": "estrategia detallada de 4-6 puntos de acción, separados por \\n"
}

Solo responde el JSON, sin texto adicional.`;
      const raw = await callGemini(apiKey, prompt);
      result = parseStringRecord(raw);

    } else if (type === "tasks") {
      const campaignName = textField(body, "campaignName", 120);
      const stage = textField(body, "stage", 60);
      const clientName = textField(body, "clientName", 120);
      const description = textField(body, "description", 1000);
      const prompt = `Eres un project manager de una agencia de marketing digital llamada Thrive Agency.

Genera una lista de tareas para esta campaña:
- Campaña: ${campaignName || "Sin nombre"}
- Cliente: ${clientName || "Sin especificar"}
- Etapa actual: ${stage || "discovery"}
- Descripción: ${description || "Sin descripción"}

Genera exactamente 5 tareas relevantes para esta etapa.
Responde en formato JSON con esta estructura:
[
  {
    "title": "título de la tarea (máx 60 chars)",
    "description": "descripción breve de qué implica",
    "priority": "low|medium|high|urgent"
  }
]
Solo responde el JSON array, sin texto adicional.`;
      const raw = await callGemini(apiKey, prompt);
      const tasks = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as unknown;
      if (!Array.isArray(tasks)) throw new Error("Invalid AI response");
      result = { tasks: JSON.stringify(tasks) };

    } else if (type === "quote") {
      const clientName = textField(body, "clientName", 120);
      const campaignName = textField(body, "campaignName", 120);
      const servicios = textField(body, "servicios", 1200);
      const presupuesto = textField(body, "presupuesto", 100);
      const prompt = `Eres un director de cuentas de una agencia de marketing digital llamada Thrive Agency.

Genera una lista de servicios para una cotización:
- Cliente: ${clientName || "Sin especificar"}
- Campaña/Proyecto: ${campaignName || "Sin especificar"}
- Servicios solicitados: ${servicios || "Sin especificar"}
- Presupuesto aproximado: ${presupuesto || "Sin especificar"}

Genera entre 3 y 6 partidas de servicios con precios razonables en USD.
Responde en formato JSON:
[
  {
    "description": "nombre del servicio",
    "quantity": 1,
    "unit_price": 500,
    "amount": 500
  }
]
Solo responde el JSON array, sin texto adicional.`;
      const raw = await callGemini(apiKey, prompt);
      const items = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as unknown;
      if (!Array.isArray(items)) throw new Error("Invalid AI response");
      result = { items: JSON.stringify(items) };

    } else if (type === "lead-email") {
      const leadName = textField(body, "leadName", 120);
      const empresa = textField(body, "empresa", 120);
      const servicio = textField(body, "servicio", 200);
      const notas = textField(body, "notas", 1200);
      const prompt = `Eres un director comercial de una agencia de marketing digital llamada Thrive Agency.

Escribe un email de seguimiento personalizado para este lead:
- Nombre: ${leadName || "Sin nombre"}
- Empresa: ${empresa || "Sin empresa"}
- Servicio de interés: ${servicio || "Marketing digital"}
- Notas / contexto: ${notas || "Sin notas"}

El email debe:
- Ser profesional pero cercano
- Tener asunto llamativo
- Mostrar valor específico para su negocio
- Incluir un CTA claro
- Máximo 150 palabras
- En español

Responde en formato JSON:
{
  "subject": "asunto del email",
  "body": "cuerpo del email completo"
}
Solo responde el JSON, sin texto adicional.`;
      const raw = await callGemini(apiKey, prompt);
      result = parseStringRecord(raw);

    } else {
      throw new Error(`Unknown type: ${type}`);
    }

    return jsonResponse(req, result);
  } catch (error: unknown) {
    const status = error instanceof AccessError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(req, { error: message }, status);
  }
});
