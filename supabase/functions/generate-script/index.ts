const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tipo, tono, descripcion, duracion, plataforma, campaignName, clientName } = await req.json();

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

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini API error");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No content generated");

    return new Response(JSON.stringify({ script: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
