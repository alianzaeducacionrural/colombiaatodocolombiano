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
  const [fase, setFase] = useState("ruleta") // "ruleta" | "pregunta" | "fin"
  const [preguntaIdx, setPreguntaIdx] = useState(0)
  const [seleccionado, setSeleccionado] = useState(null)
  const [usados, setUsados] = useState([])
  const [iluminado, setIluminado] = useState(0)
  const [girando, setGirando] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      const data = snap.val() || {}
      const lista = Object.entries(data).map(([id, p]) => ({ id, ...p }))
      setParticipantes(lista)
    })
    return () => unsub()
  }, [])

  function girarRuleta() {
    if (girando || participantes.length === 0) return
    setGirando(true)
    setSeleccionado(null)

    // Disponibles — no usados aún
    let disponibles = participantes.filter(p => !usados.includes(p.id))
    if (disponibles.length === 0) {
      disponibles = participantes
      setUsados([])
    }

    let velocidad = 80
    let iteraciones = 0
    const totalIteraciones = 25 + Math.floor(Math.random() * 15)

    intervalRef.current = setInterval(() => {
      setIluminado(prev => (prev + 1) % participantes.length)
      iteraciones++

      // Desacelerar hacia el final
      if (iteraciones > totalIteraciones * 0.6) {
        velocidad += 30
        clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => {
          setIluminado(prev => (prev + 1) % participantes.length)
          iteraciones++

          if (iteraciones >= totalIteraciones) {
            clearInterval(intervalRef.current)

            // Seleccionar ganador de los disponibles
            const ganador = disponibles[Math.floor(Math.random() * disponibles.length)]
            const ganadorIdx = participantes.findIndex(p => p.id === ganador.id)
            setIluminado(ganadorIdx)
            setSeleccionado(ganador)
            setUsados(prev => [...prev, ganador.id])
            setGirando(false)

            // Notificar al participante seleccionado
            update(ref(db, "sala/evaluacion_estado"), {
              seleccionadoId: ganador.id,
              preguntaIdx,
              activo: true,
            })
          }
        }, velocidad)
      }
    }, velocidad)
  }

  async function siguientePregunta() {
    await set(ref(db, "sala/evaluacion_estado"), null)
    if (preguntaIdx + 1 >= PREGUNTAS_EVAL.length) {
      setFase("fin")
      await update(ref(db, "sala"), { fase: "fin" })
    } else {
      setPreguntaIdx(preguntaIdx + 1)
      setSeleccionado(null)
      setFase("ruleta")
    }
  }

  if (fase === "fin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-7xl">🎉</div>
        <h2 className="text-4xl font-bold text-yellow-400">¡Actividad finalizada!</h2>
        <p className="text-gray-400 text-xl">Gracias por participar</p>
      </div>
    )
  }

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

      {/* Ruleta de nombres */}
      <div className="w-full max-w-3xl">
        <div className="flex flex-wrap gap-3 justify-center">
          {participantes.map((p, i) => (
            <div
              key={p.id}
              className={`px-5 py-3 rounded-2xl font-bold text-lg transition-all duration-100 ${
                i === iluminado && (girando || seleccionado?.id === p.id)
                  ? seleccionado?.id === p.id
                    ? "bg-yellow-400 text-gray-950 scale-110 shadow-lg shadow-yellow-400/40"
                    : "bg-yellow-400/80 text-gray-950 scale-105"
                  : usados.includes(p.id) && !girando
                  ? "bg-gray-800 text-gray-600 opacity-50"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              {p.nombre}
            </div>
          ))}
        </div>
      </div>

      {/* Seleccionado */}
      {seleccionado && !girando && (
        <div className="bg-yellow-400/10 border border-yellow-400 rounded-2xl px-8 py-4 text-center">
          <p className="text-gray-400 text-sm">Le toca responder</p>
          <p className="text-yellow-400 text-3xl font-bold mt-1">{seleccionado.nombre}</p>
          <p className="text-gray-500 text-sm mt-1">Está viendo la pregunta en su celular</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        {!seleccionado && (
          <button
            onClick={girarRuleta}
            disabled={girando}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50
                       text-gray-950 font-bold text-xl px-10 py-4 rounded-2xl
                       transition-all hover:scale-105"
          >
            {girando ? "Girando..." : "🎲 ¡Girar ruleta!"}
          </button>
        )}
        {seleccionado && !girando && (
          <button
            onClick={siguientePregunta}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold
                       px-8 py-3 rounded-xl transition"
          >
            {preguntaIdx + 1 >= PREGUNTAS_EVAL.length
              ? "Finalizar actividad 🎉"
              : "Siguiente pregunta →"}
          </button>
        )}
      </div>
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

  if (meSeleccionaron) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center
                      justify-center gap-6 px-6 text-center">
        <div className="text-6xl animate-bounce">🎤</div>
        <h2 className="text-2xl font-bold text-yellow-400">¡Te seleccionaron!</h2>
        <div className="bg-gray-900 border border-yellow-400 rounded-2xl p-6 max-w-sm">
          <p className="text-gray-400 text-sm mb-3">Tu pregunta:</p>
          <p className="text-white text-lg font-medium leading-relaxed">
            {PREGUNTAS_EVAL[estado?.preguntaIdx ?? 0]}
          </p>
        </div>
        <p className="text-gray-500 text-sm">Responde en voz alta 🎙️</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center
                    justify-center gap-5 px-6 text-center">
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
