import { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { ref, onValue } from "firebase/database"
import WordCloud from "react-d3-cloud"
import { CONFIG } from "../data/actividad.config"

// Vista del ANFITRIÓN
export function ReflexionHost() {
  const [palabras, setPalabras] = useState([])

  useEffect(() => {
    const respRef = ref(db, "sala/respuestas/reflexion")
    const unsub = onValue(respRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) return

      // Contar frecuencia de cada palabra
      const conteo = {}
      Object.values(data).forEach(({ respuesta }) => {
        if (!respuesta) return
        respuesta
          .toLowerCase()
          .split(/[\s,]+/)
          .forEach((palabra) => {
            const p = palabra.trim().replace(/[^a-záéíóúüñ]/gi, "")
            if (p.length > 2) {
              conteo[p] = (conteo[p] || 0) + 1
            }
          })
      })

      const resultado = Object.entries(conteo).map(([text, value]) => ({
        text,
        value: value * 20,
      }))
      setPalabras(resultado)
    })
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-10 py-12">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-yellow-400">🙏 Oración / Reflexión</h2>
        <p className="text-gray-400 mt-2 text-xl">{CONFIG.reflexion.pregunta}</p>
      </div>

      <div className="wc-host w-full max-w-4xl bg-gray-900 rounded-2xl border border-gray-800 p-6 min-h-72 flex items-center justify-center">
        {palabras.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-500 text-lg">Esperando respuestas...</p>
            <div className="flex gap-1 justify-center mt-4">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}}></span>
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:"150ms"}}></span>
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:"300ms"}}></span>
            </div>
          </div>
        ) : (
          <WordCloud
            data={palabras}
            width={700}
            height={350}
            fontSize={(w) => Math.log2(w.value) * 12}
            rotate={0}
            padding={4}
            random={() => 0.5}
            fill={(w, i) => {
              const colores = ["#FACC15","#60A5FA","#34D399","#F87171","#A78BFA","#FB923C"]
              return colores[i % colores.length]
            }}
          />
        )}
      </div>

      <p className="text-gray-600 text-sm">
        Las palabras aparecen en tiempo real mientras los participantes responden
      </p>
    </div>
  )
}

// Vista del PARTICIPANTE
export function ReflexionPlayer({ enviarRespuesta }) {
  const [texto, setTexto] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleEnviar() {
    if (!texto.trim() || enviado) return
    setEnviando(true)
    await enviarRespuesta("reflexion", texto.trim())
    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-yellow-400 text-center">¡Respuesta enviada!</h2>
        <p className="text-gray-400 text-center">Mira la pantalla principal para ver el word cloud</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-yellow-400">🙏 Reflexión</h2>
        <p className="text-gray-300 mt-3 text-lg leading-relaxed">{CONFIG.reflexion.pregunta}</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <textarea
          rows={3}
          placeholder="Escribe tus palabras..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-lg outline-none focus:border-yellow-400 transition placeholder-gray-500 resize-none"
        />
        <button
          onClick={handleEnviar}
          disabled={!texto.trim() || enviando}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-950 font-bold text-lg py-3 rounded-xl transition"
        >
          {enviando ? "Enviando..." : "Enviar →"}
        </button>
      </div>
    </div>
  )
}
