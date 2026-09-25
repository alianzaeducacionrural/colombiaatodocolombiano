import { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { ref, onValue, set, update } from "firebase/database"
import WordCloud from "react-d3-cloud"
import { CONFIG } from "../data/actividad.config"

const SOC_REF = "sala/reflexion_socializando"

// Vista del ANFITRIÓN
export function ReflexionHost({ onActivar }) {
  const [palabras, setPalabras] = useState([])
  const [aportes, setAportes] = useState([]) // [{ id, nombre, palabra }] de quienes enviaron palabra
  const [mostrarWordCloud, setMostrarWordCloud] = useState(false)
  const [soc, setSoc] = useState(null)

  useEffect(() => {
    const unsub = onValue(ref(db, SOC_REF), (snap) => setSoc(snap.val()))
    return () => unsub()
  }, [])

  // Elige hasta 2 personas al azar entre quienes enviaron una palabra
  function elegirAlAzar() {
    const pool = [...aportes]
    const items = []
    while (items.length < 2 && pool.length > 0) {
      items.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    set(ref(db, SOC_REF), { activo: true, paso: 0, items })
  }

  useEffect(() => {
    const respRef = ref(db, "sala/respuestas/reflexion")
    const unsub = onValue(respRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) return

      setAportes(
        Object.entries(data)
          .filter(([, v]) => v?.respuesta?.trim())
          .map(([id, v]) => ({ id, nombre: v.nombre, palabra: v.respuesta.trim() }))
      )

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

  // --- Modo SOCIALIZAR: 2 personas al azar explican su palabra, luego la pregunta del video ---
  if (soc?.activo) {
    const items = soc.items || []
    const paso = soc.paso || 0
    const enPregunta = paso >= items.length
    const actual = items[paso]

    return (
      <div className="h-full flex flex-col items-center justify-center gap-8 px-10 py-12 bg-black/50">
        {enPregunta ? (
          <>
            <p className="text-yellow-400 text-2xl font-bold uppercase tracking-widest">
              Pregunta sobre el video 🎬
            </p>
            <div className="w-full max-w-3xl bg-gray-900 border border-yellow-400/40 rounded-3xl px-10 py-12 text-center shadow-2xl shadow-yellow-400/10">
              <p className="text-white text-4xl font-bold leading-snug">
                {CONFIG.reflexion.preguntaVideo}
              </p>
            </div>
            <p className="text-gray-400 text-lg">Respondan en voz alta 🎙️</p>
          </>
        ) : (
          <>
            <p className="text-yellow-400 text-2xl font-bold uppercase tracking-widest">
              Tu palabra {paso + 1} de {items.length}
            </p>
            <div className="w-full max-w-2xl bg-yellow-400 text-gray-950 rounded-3xl px-10 py-12 text-center shadow-2xl shadow-yellow-400/20">
              <p className={`${(actual?.palabra?.length ?? 0) > 14 ? "text-4xl" : "text-6xl"} font-black leading-tight break-words`}>
                “{actual?.palabra}”
              </p>
              <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-gray-950/20">
                <div className="w-12 h-12 rounded-full bg-gray-950/15 flex items-center justify-center text-lg font-bold">
                  {actual?.nombre?.charAt(0).toUpperCase()}
                </div>
                <span className="text-2xl font-bold">{actual?.nombre}</span>
              </div>
            </div>
            <p className="text-white text-2xl font-medium text-center">
              {CONFIG.reflexion.preguntaPalabra}
            </p>
          </>
        )}

        <button
          onClick={() => (enPregunta ? set(ref(db, SOC_REF), null) : update(ref(db, SOC_REF), { paso: paso + 1 }))}
          className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-lg px-10 py-3 rounded-2xl transition-all hover:scale-105 shadow-lg"
        >
          {enPregunta ? "Volver a la nube" : paso + 1 >= items.length ? "Siguiente: pregunta del video →" : "Siguiente →"}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 px-10 py-8">
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
            <iframe
              className="w-full"
              style={{ height: "420px" }}
              src={`https://www.youtube.com/embed/${CONFIG.reflexion.videoId}?start=${CONFIG.reflexion.videoStart}&end=${CONFIG.reflexion.videoEnd}&rel=0&modestbranding=1`}
              title={CONFIG.reflexion.nombre}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          </div>

          {/* Botón para revelar la pregunta */}
          <button
            onClick={() => { onActivar(); setMostrarWordCloud(true) }}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-lg px-10 py-3 rounded-2xl transition-all hover:scale-105 shadow-lg"
          >
            Ya vimos el video →
          </button>
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

          <button
            onClick={elegirAlAzar}
            disabled={aportes.length === 0}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white font-bold text-lg px-8 py-3 rounded-2xl transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg"
          >
            Elegir 2 personas al azar 🎲
          </button>
        </>
      )}
    </div>
  )
}

// Vista del PARTICIPANTE
export function ReflexionPlayer({ enviarRespuesta, userId }) {
  const [texto, setTexto] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [videoTerminado, setVideoTerminado] = useState(false)
  const [soc, setSoc] = useState(null)

  useEffect(() => {
    const unsub = onValue(ref(db, SOC_REF), (snap) => setSoc(snap.val()))
    return () => unsub()
  }, [])

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

  // --- Modo SOCIALIZAR (tiene prioridad sobre el resto) ---
  if (soc?.activo) {
    const items = soc.items || []
    const paso = soc.paso || 0
    const actual = items[paso]
    const miPalabra = items.find((it) => it.id === userId)?.palabra
    const esMiTurno = actual?.id === userId

    if (paso >= items.length) {
      return (
        <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="text-6xl">🎬</div>
          <h2 className="text-2xl font-bold text-yellow-400">Pregunta sobre el video</h2>
          <div className="bg-gray-900 border border-yellow-400/40 rounded-2xl px-6 py-5 max-w-sm w-full">
            <p className="text-white text-xl font-bold leading-snug">{CONFIG.reflexion.preguntaVideo}</p>
          </div>
          <p className="text-gray-400">Responde en voz alta 🎙️</p>
        </div>
      )
    }

    if (esMiTurno) {
      return (
        <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="text-7xl animate-bounce">🎤</div>
          <h2 className="text-3xl font-bold text-yellow-400">¡Te tocó!</h2>
          <div className="bg-yellow-400 text-gray-950 rounded-2xl px-6 py-5 max-w-sm w-full shadow-xl">
            <p className={`${(miPalabra?.length ?? 0) > 12 ? "text-2xl" : "text-3xl"} font-black break-words`}>
              “{miPalabra}”
            </p>
          </div>
          <p className="text-white text-lg">{CONFIG.reflexion.preguntaPalabra}</p>
        </div>
      )
    }

    if (miPalabra) {
      return (
        <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-6xl animate-pulse">⏳</div>
          <h2 className="text-2xl font-bold text-yellow-400">Espera tu turno...</h2>
          <p className="text-gray-400">
            Pronto te preguntarán por tu palabra “{miPalabra}”
          </p>
        </div>
      )
    }

    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-6xl">👂</div>
        <h2 className="text-2xl font-bold text-yellow-400">Escucha a {actual?.nombre}</h2>
        <p className="text-gray-400">Explica por qué escogió “{actual?.palabra}”</p>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
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
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl animate-pulse">🎥</div>
        <h2 className="text-2xl font-bold text-yellow-400">{CONFIG.reflexion.nombre}</h2>
        <p className="text-gray-400 text-lg">Estamos viendo el video juntos</p>
        <p className="text-gray-600 text-sm mt-2">Mira la pantalla principal y presta atención…</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
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
