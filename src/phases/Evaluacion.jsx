import { useState, useEffect, useRef } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update, set } from "firebase/database"

const PREGUNTAS_EVAL = [
  "¿Se lograron las evidencias de aprendizaje propuestas?",
  "¿Qué fue lo que más te gustó de estas actividades de conjunto?",
  "¿Qué oportunidad de mejora ves para estas actividades?",
]

export function EvaluacionHost() {
  const [participantes, setParticipantes] = useState([])
  const [fase, setFase] = useState("esperando") // "esperando"|"girando"|"seleccionado"|"fin"
  const [preguntaIdx, setPreguntaIdx] = useState(0)
  const [seleccionado, setSeleccionado] = useState(null)
  const [usados, setUsados] = useState([])
  const [iluminado, setIluminado] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      const data = snap.val() || {}
      setParticipantes(Object.entries(data).map(([id, p]) => ({ id, ...p })))
    })
    return () => unsub()
  }, [])

  function girarRuleta() {
    if (fase === "girando" || participantes.length === 0) return
    clearTimeout(timerRef.current)
    setFase("girando")
    setSeleccionado(null)

    let disponibles = participantes.filter(p => !usados.includes(p.id))
    if (disponibles.length === 0) {
      disponibles = [...participantes]
      setUsados([])
    }

    let iter = 0
    const total = 25 + Math.floor(Math.random() * 15)

    // Fase rápida
    const fastInterval = setInterval(() => {
      setIluminado(prev => (prev + 1) % participantes.length)
      iter++
      if (iter > total * 0.6) {
        clearInterval(fastInterval)
        spinSlow()
      }
    }, 80)

    function spinSlow() {
      let vel = 150
      function step() {
        if (iter >= total) {
          const ganador = disponibles[Math.floor(Math.random() * disponibles.length)]
          const idx = participantes.findIndex(p => p.id === ganador.id)
          setIluminado(idx)
          setSeleccionado(ganador)
          setUsados(prev => [...prev, ganador.id])
          setFase("seleccionado")
          update(ref(db, "sala/evaluacion_estado"), {
            seleccionadoId: ganador.id,
            seleccionadoNombre: ganador.nombre,
            preguntaIdx,
            activo: true,
          })
          return
        }
        setIluminado(prev => (prev + 1) % participantes.length)
        iter++
        vel += 40
        timerRef.current = setTimeout(step, vel)
      }
      step()
    }
  }

  async function siguientePregunta() {
    await set(ref(db, "sala/evaluacion_estado"), null)
    if (preguntaIdx + 1 >= PREGUNTAS_EVAL.length) {
      setFase("fin")
      await update(ref(db, "sala"), { fase: "fin" })
    } else {
      setPreguntaIdx(preguntaIdx + 1)
      setSeleccionado(null)
      setFase("esperando")
    }
  }

  // FIN
  if (fase === "fin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-7xl">🎉</div>
        <h2 className="text-4xl font-bold text-yellow-400">¡Actividad finalizada!</h2>
        <p className="text-gray-400 text-xl">Gracias por participar</p>
      </div>
    )
  }

  // SELECCIONADO — grande e impactante
  if (fase === "seleccionado") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-10 py-12 text-center">
        <p className="text-gray-500 text-sm uppercase tracking-widest">
          Evaluación — Pregunta {preguntaIdx + 1} de {PREGUNTAS_EVAL.length}
        </p>

        <div className="flex flex-col items-center gap-3">
          <p className="text-gray-400 text-xl">Le toca responder</p>
          <div className="text-8xl font-black text-yellow-400 leading-tight tracking-tight">
            {seleccionado?.nombre}
          </div>
        </div>

        <div className="bg-gray-900 border border-yellow-400/30 rounded-3xl px-10 py-8 max-w-2xl w-full">
          <p className="text-gray-400 text-xs mb-3 uppercase tracking-widest">Pregunta</p>
          <p className="text-white text-2xl font-bold leading-relaxed">
            {PREGUNTAS_EVAL[preguntaIdx]}
          </p>
        </div>

        <p className="text-gray-500 text-sm">Está viendo la pregunta en su celular 📱</p>

        <button
          onClick={siguientePregunta}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-8 py-3 rounded-xl transition"
        >
          {preguntaIdx + 1 >= PREGUNTAS_EVAL.length ? "Finalizar actividad 🎉" : "Siguiente →"}
        </button>
      </div>
    )
  }

  // ESPERANDO / GIRANDO — ruleta
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-10 py-12">
      <div className="text-center">
        <p className="text-gray-500 text-sm uppercase tracking-widest">Evaluación</p>
        <h2 className="text-3xl font-bold text-yellow-400 mt-1">
          {PREGUNTAS_EVAL[preguntaIdx]}
        </h2>
        <p className="text-gray-500 text-sm mt-2">
          Pregunta {preguntaIdx + 1} de {PREGUNTAS_EVAL.length}
        </p>
      </div>

      <div className="w-full max-w-3xl">
        <div className="flex flex-wrap gap-3 justify-center">
          {participantes.map((p, i) => (
            <div
              key={p.id}
              className={`px-5 py-3 rounded-2xl font-bold text-lg transition-all duration-100 ${
                i === iluminado && fase === "girando"
                  ? "bg-yellow-400 text-gray-950 scale-110 shadow-lg shadow-yellow-400/40"
                  : usados.includes(p.id)
                  ? "bg-gray-800 text-gray-600 opacity-50"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              {p.nombre}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={girarRuleta}
        disabled={fase === "girando"}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50
                   text-gray-950 font-bold text-xl px-10 py-4 rounded-2xl
                   transition-all hover:scale-105 disabled:hover:scale-100"
      >
        {fase === "girando" ? "Girando..." : "🎲 ¡Girar ruleta!"}
      </button>
    </div>
  )
}

export function EvaluacionPlayer({ userId, nombre }) {
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/evaluacion_estado"), snap => {
      setEstado(snap.val())
    })
    return () => unsub()
  }, [])

  const meSeleccionaron = estado?.seleccionadoId === userId && estado?.activo

  // ME SELECCIONARON — protagonista
  if (meSeleccionaron) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl animate-bounce">🎤</div>
        <h1 className="text-5xl font-black text-yellow-400">{nombre}</h1>
        <div className="bg-gray-900 border border-yellow-400 rounded-2xl p-6 max-w-sm w-full">
          <p className="text-gray-400 text-xs mb-3 uppercase tracking-widest">Tu pregunta</p>
          <p className="text-white text-xl font-bold leading-relaxed">
            {PREGUNTAS_EVAL[estado?.preguntaIdx ?? 0]}
          </p>
        </div>
        <p className="text-yellow-400 font-bold text-lg">Responde en voz alta 🎙️</p>
      </div>
    )
  }

  // ALGUIEN MÁS RESPONDE — ve la pregunta también
  if (estado?.activo && estado?.seleccionadoNombre) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-4xl">🎤</div>
        <p className="text-gray-400 text-lg">Está respondiendo</p>
        <h2 className="text-3xl font-bold text-white">{estado.seleccionadoNombre}</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 max-w-sm w-full">
          <p className="text-gray-500 text-xs mb-2 uppercase tracking-widest">Pregunta</p>
          <p className="text-white text-base font-medium leading-relaxed">
            {PREGUNTAS_EVAL[estado?.preguntaIdx ?? 0]}
          </p>
        </div>
        <p className="text-gray-600 text-sm">Escucha y participa en la conversación</p>
      </div>
    )
  }

  // ESPERANDO ruleta
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="text-5xl animate-pulse">🎲</div>
      <h2 className="text-2xl font-bold text-yellow-400">Evaluación final</h2>
      <p className="text-gray-400">
        {estado?.activo
          ? "Otro participante está respondiendo…"
          : "Espera a que el anfitrión gire la ruleta"}
      </p>
    </div>
  )
}
