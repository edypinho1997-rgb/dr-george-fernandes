const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function buildEvaluationContext(avaliacao: Record<string, unknown>) {
  const evolucoes = Array.isArray(avaliacao?.evolucoes)
    ? avaliacao.evolucoes
      .map((entry, index) => `${index + 1}. ${entry || ""}`.trim())
      .filter((entry) => entry.length > 3)
      .join("\n")
    : "";

  const lines = [
    ["Nome", avaliacao?.nome],
    ["Idade", avaliacao?.idade],
    ["Data de nascimento", avaliacao?.dataNascimento],
    ["Queixa principal", avaliacao?.queixa],
    ["Dor atual", avaliacao?.dor ? `${avaliacao.dor}/10` : ""],
    ["Area acometida", avaliacao?.areaAcometida],
    ["HDA", avaliacao?.hda],
    ["Sessoes realizadas", avaliacao?.sessoesRealizadas],
    ["Evolucoes", evolucoes],
    ["Consideracoes finais", avaliacao?.consideracoes],
  ]
    .map(([label, value]) => {
      const text = `${value || ""}`.trim();
      return text ? `${label}: ${text}` : "";
    })
    .filter(Boolean);

  return lines.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo nao permitido." }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "GEMINI_API_KEY nao configurada no Supabase." }, 500);
  }

  try {
    const { pergunta = "", avaliacao = {} } = await req.json();
    if (!`${pergunta}`.trim()) {
      return jsonResponse({ error: "Pergunta vazia." }, 400);
    }

    const prompt = `Voce e um assistente de apoio para uma clinica de fisioterapia.
Responda em portugues do Brasil, de forma clara, objetiva e profissional.
Seja direto e especifico. Evite textos longos, introducoes e explicacoes genericas.
Prefira responder em 3 a 6 topicos curtos.
Use o contexto da avaliacao quando for relevante.
Ajude com raciocinio clinico fisioterapeutico, CIF, linguagem de relatorio, organizacao de informacoes e duvidas de conduta dentro da fisioterapia.
Quando perguntarem sobre exercicio, responda com: objetivo, como fazer, dosagem sugerida e cuidados/contraindicacoes principais.
Nao monte protocolos extensos se a pergunta pedir apenas uma opcao ou uma orientacao simples.
Nao invente dados do paciente.
Nao de diagnostico medico fechado, prescricao medicamentosa, interpretacao definitiva de exame ou decisao que dependa de outro profissional.
Quando a pergunta ou o caso passar do escopo da fisioterapia, diga isso com clareza e recomende encaminhar ou confirmar com o profissional competente.
Quando houver sinais de alerta, oriente avaliacao medica.
Se a resposta for incerta, explique o que falta saber.

Contexto da avaliacao:
${buildEvaluationContext(avaliacao) || "-"}

Pergunta:
${pergunta}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.25,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const details = await geminiResponse.text();
      return jsonResponse({ error: "Falha ao chamar Gemini.", details }, 502);
    }

    const geminiData = await geminiResponse.json();
    const resposta = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return jsonResponse({
      resposta: resposta.trim(),
    });
  } catch (error) {
    return jsonResponse({
      error: "Falha ao responder pergunta.",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
