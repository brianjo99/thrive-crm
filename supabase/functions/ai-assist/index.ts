const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content generated");
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const body = await req.json();
    const { type } = body;

    let result: Record<string, string> = {};

    if (type === "campaign") {
      const { clientName, industry, objetivo, presupuesto, plataformas } = body;
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
      const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
      result = json;

    } else if (type === "tasks") {
      const { campaignName, stage, clientName, description } = body;
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
      const tasks = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
      result = { tasks: JSON.stringify(tasks) };

    } else if (type === "quote") {
      const { clientName, campaignName, servicios, presupuesto } = body;
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
      const items = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
      result = { items: JSON.stringify(items) };

    } else if (type === "lead-email") {
      const { leadName, empresa, servicio, notas } = body;
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
      const email = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
      result = email;

    } else {
      throw new Error(`Unknown type: ${type}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
