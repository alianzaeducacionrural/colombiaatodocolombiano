import { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update } from "firebase/database"

const COLORES_POSTIT = [
  { bg: "#FACC15", text: "#1a1a1a" }, // amarillo
  { bg: "#86EFAC", text: "#1a1a1a" }, // verde
  { bg: "#93C5FD", text: "#1a1a1a" }, // azul
  { bg: "#FCA5A5", text: "#1a1a1a" }, // rojo suave
  { bg: "#C4B5FD", text: "#1a1a1a" }, // morado
  { bg: "#FDB97D", text: "#1a1a1a" }, // naranja
  { bg: "#F9A8D4", text: "#1a1a1a" }, // rosado
  { bg: "#6EE7B7", text: "#1a1a1a" }, // menta
]

function colorParaParticipante(userId) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % COLORES_POSTIT.length
  return COLORES_POSTIT[idx]
}

// Vista del ANFITRIÓN
export function InstrumentoHost() {
  const [retos, setRetos] = useState([])

  useEffect(() => {
    const retosRef = ref(db, "sala/respuestas/instrumento")
    const unsub = onValue(retosRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setRetos([])
        return
      }
      const lista = Object.entries(data).map(([userId, val]) => ({
        userId,
        nombre: val.nombre,
        reto: val.respuesta,
        timestamp: val.timestamp,
      }))
      lista.sort((a, b) => a.timestamp - b.timestamp)
      setRetos(lista)
    })
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center px-10 py-12 gap-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-yellow-400">⚡ ¡El reto de hoy!</h2>
        <p className="text-gray-400 mt-2 text-xl">
          ¿Cuál es tu reto laboral para esta jornada?
        </p>
      </div>

      {retos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500 text-lg">Esperando que los participantes escriban su reto...</p>
          <div className="flex gap-1 justify-center">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}}></span>
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:"150ms"}}></span>
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:"300ms"}}></span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {retos.map((item) => {
            const color = colorParaParticipante(item.userId)
            return (
              <div
                key={item.userId}
                className="rounded-2xl p-5 flex flex-col gap-3 shadow-lg"
                style={{
                  backgroundColor: color.bg,
                  color: color.text,
                  animation: "fadeInUp 0.4s ease-out"
                }}
              >
                {/* Líneas decorativas tipo post-it */}
                <div className="flex flex-col gap-1 opacity-20">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-px w-full bg-current" />
                  ))}
                </div>

                <p className="text-base font-medium leading-snug flex-1">
                  "{item.reto}"
                </p>

                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-current border-opacity-20">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
                  >
                    {item.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold">{item.nombre}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-gray-600 text-sm">
        {retos.length} participante{retos.length !== 1 ? "s" : ""} han compartido su reto
      </p>
    </div>
  )
}

// Vista del PARTICIPANTE
export function InstrumentoPlayer({ enviarRespuesta, nombre }) {
  const [texto, setTexto] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [miColor, setMiColor] = useState(null)

  async function handleEnviar() {
    if (!texto.trim() || enviado) return
    setEnviando(true)
    await enviarRespuesta("instrumento", texto.trim())
    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) {
    const color = miColor || COLORES_POSTIT[0]
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-gray-400 text-sm">Tu reto de hoy:</p>
        <div
          className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          <div className="flex flex-col gap-1 opacity-20">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-px w-full bg-current" />
            ))}
          </div>
          <p className="text-lg font-medium leading-snug">"{texto}"</p>
          <div className="flex items-center gap-2 pt-2 border-t border-current border-opacity-20">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
            >
              {nombre.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold">{nombre}</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm text-center">
          Tu reto aparece en la pantalla principal 🎯
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-yellow-400">⚡ ¡El reto de hoy!</h2>
        <p className="text-gray-300 mt-3 text-base leading-relaxed">
          ¿Cuál es el reto laboral más importante que quieres asumir hoy?
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <textarea
          rows={4}
          placeholder="Ej: Concentrarme más en las actividades, ser más puntual..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-base outline-none focus:border-yellow-400 transition placeholder-gray-500 resize-none"
        />
        <button
          onClick={handleEnviar}
          disabled={!texto.trim() || enviando}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-950 font-bold text-lg py-3 rounded-xl transition"
        >
          {enviando ? "Enviando..." : "Compartir mi reto →"}
        </button>
      </div>
    </div>
  )
}
