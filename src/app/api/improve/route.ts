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
2. <h3>Sprechi (Muda)</h3> — Classify into: Sovraproduzione, Attesa, Trasporto, Sovralaborazione, Scorte, Movimento, Difetti
3. <h3>Cause Radice e Strumenti Lean</h3> — Root causes + 2-3 tools from this list: ${toolNames.join(', ')}
4. <h3>Miglioramenti e Quick Wins</h3> — Practical actions + fast wins
5. <h3>KPI da Monitorare</h3> — 3-5 specific metrics

Be concrete, specific to the user's context. No generic advice.
IMPORTANT: Do NOT greet the user. Start immediately with structured analysis. No introductions.`
const GOOGLE_URL = process.env.GOOGLE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function callModel(text: string, model: string) {
  const response = await fetch(
    `${GOOGLE_URL}?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          },
          {
            role: 'user',
            parts: [{ text }]
          }
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
    return { error: data, success: false }
  }

  const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!textResponse) {
    return { error: data, success: false }
  }

  return {
    success: true,
    text: textResponse
  }
}

async function callWithFallback(text: string) {
  // 1. prova Flash
  const flashResult = await callModel(text, "gemini-2.5-flash")

  if (flashResult.success) {
    return { ...flashResult, model: "gemini-2.5-flash" }
  }

  console.warn("Flash failed, trying Flash Lite:", flashResult.error)

  // 2. fallback Lite
  const liteResult = await callModel(text, "gemini-2.5-flash-lite")

  if (liteResult.success) {
    return { ...liteResult, model: "gemini-2.5-flash-lite" }
  }

  // 3. fallimento totale
  return {
    success: false,
    error: liteResult.error || flashResult.error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        {
          success: false,
          errorType: 'INVALID_INPUT',
          message: 'Testo non valido',
        },
        { status: 400 }
      )
    }

    const result = await callWithFallback(text)

    // ❌ caso fallimento totale Gemini
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errorType: 'GEMINI_ERROR',
          message: 'Errore API Gemini',
          error: result.error,
        },
        { status: 500 }
      )
    }

    // ✅ successo
    return NextResponse.json({
      success: true,
      data: {
        improved: result.text,
        model: result.model,
      },
    })

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        errorType: 'SERVER_ERROR',
        message: error?.message || 'Errore imprevisto',
      },
      { status: 500 }
    )
  }
}

