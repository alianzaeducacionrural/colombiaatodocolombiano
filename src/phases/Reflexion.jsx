import { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { ref, onValue } from "firebase/database"
import WordCloud from "react-d3-cloud"
import { CONFIG } from "../data/actividad.config"

// Vista del ANFITRIÓN
export function ReflexionHost({ onActivar }) {
  const [palabras, setPalabras] = useState([])
  const [mostrarWordCloud, setMostrarWordCloud] = useState(false)

  useEffect(() => {
    const respRef = ref(db, "sala/respuestas/reflexion")
    const unsub = onValue(respRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) return

      const conteo = {}
      Object.values(data).forEach(({ respuesta }) => {
        if (!respuesta) return
        const p = respuesta.trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, "")
        if (p.length > 1) conteo[p] = (conteo[p] || 0) + 1
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
      {!mostrarWordCloud ? (
        <>
          {/* Título del momento */}
          <div className="text-center">
            <p className="text-gray-500 text-sm uppercase tracking-widest mb-2">Oración / Reflexión</p>
            <h2 className="text-4xl font-bold text-yellow-400">
              {CONFIG.reflexion.nombre}
            </h2>
          </div>

          {/* Video embebido */}
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-gray-800">
            <div className="relative" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${CONFIG.reflexion.videoId}?start=${CONFIG.reflexion.videoStart}&end=${CONFIG.reflexion.videoEnd}&rel=0&modestbranding=1`}
                title={CONFIG.reflexion.nombre}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Botón para revelar la pregunta */}
          <button
            onClick={() => { onActivar(); setMostrarWordCloud(true) }}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-lg px-10 py-3 rounded-2xl transition-all hover:scale-105 shadow-lg"
          >
            Ya vimos el video →
          </button>

          <p className="text-gray-600 text-sm">
            Cuando terminen de ver el video, presiona el botón para activar la pregunta en los celulares
          </p>
        </>
      ) : (
        <>
          {/* Word cloud */}
          <div className="text-center">
            <p className="text-gray-500 text-sm uppercase tracking-widest mb-2">Oración / Reflexión</p>
            <h2 className="text-4xl font-bold text-yellow-400">
              {CONFIG.reflexion.instruccion}
            </h2>
          </div>

          <div className="wc-host w-full max-w-4xl bg-gray-900 rounded-2xl border border-gray-800 p-6 min-h-72 flex items-center justify-center">
            {palabras.length === 0 ? (
              <div className="text-center">
                <p className="text-gray-500 text-lg">Esperando palabras...</p>
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
                fontSize={(w) => Math.log2(w.value) * 14}
                rotate={0}
                padding={6}
                random={() => 0.5}
                fill={(w, i) => {
                  const colores = ["#FACC15","#60A5FA","#34D399","#F87171","#A78BFA","#FB923C"]
                  return colores[i % colores.length]
                }}
              />
            )}
          </div>

          <p className="text-gray-500 text-sm">
            {palabras.length} palabra{palabras.length !== 1 ? "s" : ""} recibida{palabras.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  )
}

// Vista del PARTICIPANTE
export function ReflexionPlayer({ enviarRespuesta }) {
  const [texto, setTexto] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [videoTerminado, setVideoTerminado] = useState(false)

  // Escucha si el anfitrión activó la pregunta
  useEffect(() => {
    const ref2 = ref(db, "sala/reflexion_activa")
    const unsub = onValue(ref2, (snapshot) => {
      if (snapshot.val() === true) setVideoTerminado(true)
    })
    return () => unsub()
  }, [])

  async function handleEnviar() {
    const palabra = texto.trim()
    if (!palabra || enviado) return
    if (palabra.split(/\s+/).length > 2) return // máximo 2 palabras
    setEnviando(true)
    await enviarRespuesta("reflexion", palabra)
    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl">✨</div>
        <h2 className="text-2xl font-bold text-yellow-400">¡Gracias!</h2>
        <p className="text-gray-400">Tu palabra ya aparece en la pantalla</p>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4 mt-2">
          <p className="text-white text-2xl font-bold">"{texto}"</p>
        </div>
      </div>
    )
  }

  if (!videoTerminado) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl animate-pulse">🎥</div>
        <h2 className="text-2xl font-bold text-yellow-400">{CONFIG.reflexion.nombre}</h2>
        <p className="text-gray-400 text-lg">Estamos viendo el video juntos</p>
        <p className="text-gray-600 text-sm mt-2">Mira la pantalla principal y presta atención…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-yellow-400">
          {CONFIG.reflexion.instruccion}
        </h2>
        <p className="text-gray-500 text-sm mt-2">Solo una palabra</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="Escribe una palabra..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEnviar()}
          maxLength={30}
          className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-4 text-xl text-center outline-none focus:border-yellow-400 transition placeholder-gray-500"
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
