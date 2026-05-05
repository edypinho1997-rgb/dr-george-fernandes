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

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Resposta da IA nao veio em JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function buildEvaluationContext(avaliacao: Record<string, unknown>) {
  const lines = [
    ["Nome", avaliacao?.nome],
    ["Idade", avaliacao?.idade],
    ["Data de nascimento", avaliacao?.dataNascimento],
    ["Queixa principal", avaliacao?.queixa],
    ["Dor atual", avaliacao?.dor ? `${avaliacao.dor}/10` : ""],
    ["Area acometida", avaliacao?.areaAcometida],
    ["Sessoes realizadas", avaliacao?.sessoesRealizadas],
  ]
    .map(([label, value]) => {
      const text = `${value || ""}`.trim();
      return text ? `${label}: ${text}` : "";
    })
    .filter(Boolean);

  return lines.join("\n");
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
    const { hda = "", consideracoes = "", evolucoes = [], avaliacao = {} } = await req.json();
    const evaluationContext = buildEvaluationContext(avaliacao);
    const evolutionText = Array.isArray(evolucoes)
      ? evolucoes
        .map((entry, index) => `${index + 1}. ${entry || ""}`.trim())
        .filter((entry) => entry.length > 3)
        .join("\n")
      : "";

    const prompt = `Reformule apenas os textos abaixo em linguagem profissional para relatorio fisioterapeutico.
Nao invente informacoes.
Nao adicione diagnostico que nao foi informado.
Mantenha o sentido clinico.
Corrija portugues, pontuacao e organize as frases.
Use tambem o contexto da avaliacao, incluindo queixa principal, dor, area acometida e sessoes realizadas, para manter coerencia clinica.
Use as evolucoes como contexto clinico para manter coerencia, principalmente nas consideracoes finais.
Nao copie automaticamente as evolucoes para a resposta, a menos que ajudem a reformular os blocos solicitados.
Nas consideracoes finais, faca um resumo clinico do que ja aconteceu no caso, com base na HDA e nas evolucoes.
Escreva as consideracoes finais no passado ou no estado clinico atual, como fechamento do atendimento realizado, nunca como plano principal de tratamento futuro.
Inclua sinais de melhora, sintomas que permaneceram, limitacoes ou resposta ao tratamento somente quando isso estiver descrito.
Se os dados indicarem necessidade, finalize mencionando que deve ser dada continuidade ao tratamento fisioterapeutico.
Nao afirme alta, cura, piora, quantidade de sessoes futuras ou continuidade obrigatoria se isso nao estiver sustentado pelo texto informado.
Se algum bloco ficar com menos de 3 linhas, desenvolva levemente a redacao apenas quando houver informacao suficiente.
Nao invente quantidade de sessoes, frequencia, prazos, diagnostico, condutas ou evolucao que nao foram informados.
Se houver pouca informacao, mantenha o texto curto e claro em vez de completar com suposicoes.

Responda somente em JSON valido, neste formato:
{
  "hda": "texto reformulado da HDA",
  "consideracoes": "texto reformulado das consideracoes finais"
}

HDA:
${hda || "-"}

Contexto da avaliacao:
${evaluationContext || "-"}

Evolucoes registradas:
${evolutionText || "-"}

Consideracoes finais:
${consideracoes || "-"}`;

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
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const details = await geminiResponse.text();
      return jsonResponse({ error: "Falha ao chamar Gemini.", details }, 502);
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = extractJson(text);

    return jsonResponse({
      hda: `${parsed.hda || ""}`.trim(),
      consideracoes: `${parsed.consideracoes || ""}`.trim(),
    });
  } catch (error) {
    return jsonResponse({
      error: "Falha ao reformular texto.",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
