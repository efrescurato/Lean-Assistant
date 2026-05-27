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

Be concrete, specific to the user's context. No generic advice.`

const GOOGLE_API_KEY = 'AIzaSyCxW6LwPflbEeSC_xL7t7n-m812NZ8uR7c'
const GOOGLE_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`

async function callModel(messages: { role: string; content: string }[]) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const response = await fetch(GOOGLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.7
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`${response.status}: ${errorData}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta disponibile. Riprova.'
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ improved: 'Errore: testo non valido.' }, { status: 400 })
    }

    const messages = [
      { role: 'user', content: systemPrompt },
      { role: 'user', content: text }
    ]

    console.log('Calling Google AI with gemini-2.5-flash')
    const improved = await callModel(messages)
    console.log('Google AI success')

    return NextResponse.json({ improved })
  } catch (error: any) {
    console.error('Google AI Error:', error)
    return NextResponse.json({
      improved: `Errore: ${error.message || 'Errore imprevisto. Riprova.'}`
    }, { status: 500 })
  }
}