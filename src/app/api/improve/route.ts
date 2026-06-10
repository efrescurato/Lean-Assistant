import { NextRequest, NextResponse } from 'next/server'

const toolNames = [
  "5S (Workplace Organization)", "Analisi di Pareto (Prioritization)", "Andon (Visual Management)",
  "Asaichi (Daily Management)", "Diagramma di Ishikawa (Root Cause)", "Finestra Kaizen (Standard Management)",
  "Gemba (Operational Management)", "Hansei (Reflection)", "5 Why (Root Cause)",
  "Ishikawa Diagram (Root Cause)", "Kaikaku (Strategic Improvement)", "Kaizen (Continuous Improvement)",
  "Kanban (Flow Management)", "Just-In-Time (Production System)", "Lead Time (Flow Efficiency)",
  "Lean Manufacturing (Production System)", "Mizusumashi (Logistics)", "Muda (Waste Elimination)",
  "Mura (Variability Reduction)", "Muri (Overburden Reduction)", "One Piece Flow (Flow Efficiency)",
  "PDCA (Continuous Improvement)", "Poka-Yoke (Error Proofing)", "SMED (Setup Reduction)",
  "Standard Work (Process Standardization)", "Takt Time (Production Planning)",
  "TPM (Equipment Maintenance)", "Value Stream Mapping (Process Analysis)",
  "Visual Management (Workplace Organization)", "Heijunka (Production Leveling)",
  "A3 Problem Solving (Structured Problem Solving)", "Jidoka (Quality at Source)"
]

const systemPrompt = `You are a Lean Expert. Help anyone apply Lean to their work. Respond in Italian.

Structure your response in 5 sections using HTML (<h3>, <strong>, <ul><li>). No markdown. Max 800 words.

1. <h3>Riepilogo e Problemi</h3> — Brief summary + key inefficiencies
2. <h3>Sprechi (Muda)</h3> — Classify into: Sovraproduzione, Attesa, Trasporto, Sovralavorazione, Scorte, Movimento, Difetti
3. <h3>Cause Radice e Strumenti Lean</h3> — Root causes + 2-3 tools from this list: ${toolNames.join(', ')}
4. <h3>Miglioramenti e Quick Wins</h3> — Practical actions + fast wins
5. <h3>KPI da Monitorare</h3> — 3-5 specific metrics

Be concrete, specific to the user's context. No generic advice.
IMPORTANT: Do NOT greet the user. Start immediately with structured analysis. No introductions.`

const GOOGLE_URL = process.env.GOOGLE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callModel(text: string, model: string) {
  const response = await fetch(
    `${GOOGLE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text }] }
        ],
        generationConfig: {
          maxOutputTokens: 6000,
          temperature: 0.3
        }
      })
    }
  )

  const data = await response.json()

  if (!response.ok) {
    const isRateLimit = response.status === 429 || response.status === 503 || data?.error?.status === 'RESOURCE_EXHAUSTED' || data?.error?.status === 'UNAVAILABLE'
    console.warn(`[${model}] HTTP ${response.status} isRateLimit=${isRateLimit}`, JSON.stringify(data?.error))
    return { error: data, success: false, isRateLimit }
  }

  const candidate = data?.candidates?.[0]
  const textResponse = candidate?.content?.parts?.[0]?.text
  const finishReason = candidate?.finishReason

  if (!textResponse) {
    // Risposta vuota nonostante HTTP 200: logga tutto per debug
    console.warn(`[${model}] Risposta vuota. finishReason=${finishReason}`, JSON.stringify(data))
    return { error: { finishReason, raw: data }, success: false, isRateLimit: false }
  }

  console.info(`[${model}] OK. finishReason=${finishReason}, chars=${textResponse.length}`)
  return { success: true, text: textResponse, isRateLimit: false }
}

async function callWithFallback(text: string) {
  // 1. Prima chiamata a Flash
  let flashResult = await callModel(text, "gemini-2.5-flash")

  if (flashResult.success) {
    return { ...flashResult, model: "gemini-2.5-flash" }
  }

  // 2. Retry su Flash solo se è rate limit (429 / RESOURCE_EXHAUSTED)
  if (flashResult.isRateLimit) {
    console.warn("Rate limit su Flash, aspetto 3s e riprovo...")
    await sleep(3000)
    flashResult = await callModel(text, "gemini-2.5-flash")

    if (flashResult.success) {
      console.info("Flash OK al retry")
      return { ...flashResult, model: "gemini-2.5-flash" }
    }
  }

  // 3. Flash non recuperabile: fallback su Lite
  console.warn("Fallback su gemini-2.5-flash-lite. Ultimo errore Flash:", JSON.stringify(flashResult.error))
  const liteResult = await callModel(text, "gemini-2.5-flash-lite")

  if (liteResult.success) {
    return { ...liteResult, model: "gemini-2.5-flash-lite" }
  }

  // 4. Fallimento totale
  return { success: false, error: liteResult.error || flashResult.error }
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, errorType: 'INVALID_INPUT', message: 'Testo non valido' },
        { status: 400 }
      )
    }

    const result = await callWithFallback(text)

    if (!result.success) {
      return NextResponse.json(
        { success: false, errorType: 'GEMINI_ERROR', message: 'Errore API Gemini', error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        improved: result.text,
        model: result.model,
      },
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, errorType: 'SERVER_ERROR', message: error?.message || 'Errore imprevisto' },
      { status: 500 }
    )
  }
}
