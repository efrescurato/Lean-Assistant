'use client'

import { useState } from 'react'

export default function Home() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const analyzeProcess = async () => {
    if (!input.trim()) return
    setLoading(true)
    setOutput('<p style="color: #6D76AC;"><em>Analisi in corso... Questa operazione potrebbe richiedere qualche minuto. L\'AI sta elaborando i consigli Lean personalizzati per te.</em></p>')
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minuti timeout

      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Get response text first to handle non-JSON responses
      const responseText = await res.text()

      if (!res.ok) {
        // Try to parse as JSON, if fails show the raw response
        try {
          const errorData = JSON.parse(responseText)
          setOutput(errorData.improved || errorData.error || 'Si è verificato un errore. Riprova.')
        } catch {
          setOutput(`Errore server (${res.status}): ${responseText.substring(0, 200)}...`)
        }
        return
      }

      // Parse successful response
      try {
        const data = JSON.parse(responseText)

        if (!data.success) {
          setOutput(data.message || 'Errore sconosciuto')
          return
        }

      setOutput(data.data?.improved || 'Nessuna risposta disponibile. Riprova.')
        
      } catch (parseError) {
        console.error('Parse error:', parseError)
        setOutput('Errore nell\'elaborazione della risposta. Riprova.')
      }
    } catch (e: any) {
      console.error('Fetch error:', e)
      if (e.name === 'AbortError') {
        setOutput('La richiesta ha impiegato troppo tempo. Riprova tra qualche minuto o con una descrizione più breve.')
      } else {
        setOutput(`Errore di connessione: ${e.message || 'Impossibile connettersi al server. Riprova.'}`)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff', fontFamily: 'Montserrat, sans-serif' }}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 flex items-center justify-center px-6 py-4 border-b" style={{ backgroundColor: '#ffffff', borderColor: '#081977' }}>
        <div className="absolute left-6">
          <img
            src="https://static.wixstatic.com/media/d81e95_65c796f692974907a7ab0613bf34af03~mv2.png/v1/fill/w_155,h_153,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo_leanbet.png"
            alt="Leanbet Logo"
            style={{ height: '55px', width: 'auto' }}
          />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#081977', margin: 0 }}>
          Lean Process Assistant
        </h1>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '40px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#081977', marginBottom: '12px', marginTop: 0 }}>
            Come posso applicare la Lean nel mio lavoro?
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px', lineHeight: 1.6 }}>
            Descrivi il tuo lavoro, la tua professione o un processo specifico che vuoi migliorare. 
            Riceverai consigli Lean pratici e personalizzati per la tua situazione, che tu sia un dentista, 
            un ristoratore, un programmatore, un medico o qualsiasi altro professionista.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#081977', marginBottom: '8px' }}>
              Descrivi il tuo lavoro o processo
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Esempi di domande:&#10;&#10;• Operations: Gestisco una linea di produzione con frequenti fermi macchina e sprechi di materiale&#10;• Marketing: Il nostro team di marketing ha processi approvativi troppo lunghi che rallentano le campagne&#10;• Dentista: Nel mio studio dentistico i tempi di attesa dei pazienti sono troppo lunghi e gli strumenti non sono sempre pronti&#10;• Management: Il nostro team di gestione ha riunioni inefficienti e decisioni prese troppo lentamente&#10;&#10;Descrivi la tua situazione in dettaglio..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '16px',
                border: '1px solid #6D76AC',
                borderRadius: '6px',
                fontSize: '15px',
                fontFamily: 'Montserrat, sans-serif',
                resize: 'vertical',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                lineHeight: 1.6
              }}
              onFocus={(e) => e.target.style.borderColor = '#081977'}
              onBlur={(e) => e.target.style.borderColor = '#6D76AC'}
            />
          </div>

          <button
            onClick={analyzeProcess}
            disabled={loading || !input.trim()}
            style={{
              backgroundColor: (loading || !input.trim()) ? '#6D76AC' : '#081977',
              color: '#ffffff',
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
              fontFamily: 'Montserrat, sans-serif'
            }}
            onMouseEnter={(e) => !loading && input.trim() && (e.target.style.backgroundColor = '#6D76AC')}
            onMouseLeave={(e) => !loading && input.trim() && (e.target.style.backgroundColor = '#081977')}
          >
            {loading ? 'Analisi in corso...' : 'Ottieni Consigli Lean'}
          </button>
        </div>

        {/* Results Section */}
        {output && (
          <div style={{
            marginTop: '40px',
            padding: '40px',
            backgroundColor: '#f8f9fc',
            borderRadius: '8px',
            border: '1px solid #6D76AC',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            <h3 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#081977',
              marginBottom: '24px',
              marginTop: 0,
              paddingBottom: '12px',
              borderBottom: '2px solid #081977'
            }}>
              I Tuoi Consigli Lean Personalizzati
            </h3>
            <div
              className="result-content"
              dangerouslySetInnerHTML={{ __html: output }}
              style={{
                fontSize: '15px',
                lineHeight: 1.8,
                color: '#333',
                fontFamily: 'Montserrat, sans-serif'
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        marginTop: 'auto', 
        padding: '20px', 
        textAlign: 'center', 
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e0e0e0'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666', fontFamily: 'Montserrat, sans-serif' }}>
          © 2025 Leanbet - Lean Process Analyzer
        </p>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: HTML translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          padding: 0;
        }

        /* Custom styling for HTML content */
        .result-content strong {
          color: #081977;
          font-weight: 700;
        }

        .result-content h3 {
          color: #081977;
          font-size: 18px;
          font-weight: 700;
          margin-top: 24px;
          margin-bottom: 12px;
        }

        .result-content h4 {
          color: #081977;
          font-size: 16px;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 10px;
        }

        .result-content p {
          margin-bottom: 12px;
          line-height: 1.8;
        }

        .result-content ul {
          margin: 12px 0;
          padding-left: 24px;
        }

        .result-content li {
          margin-bottom: 8px;
          line-height: 1.7;
        }

        .result-content em {
          color: #6D76AC;
          font-style: italic;
        }

        .result-content h3:first-child {
          margin-top: 0;
        }
      `}</style>
    </div>
  )
}
