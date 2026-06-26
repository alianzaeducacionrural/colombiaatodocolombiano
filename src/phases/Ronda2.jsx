import { useState, useEffect, useRef } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update, set } from "firebase/database"
import { CONFIG } from "../data/actividad.config"

const ronda = CONFIG.rondas[1]
const LETRAS = ["A", "B", "C", "D"]
const NIVELES = [
  { blur: "blur-xl", label: "🟡 1000 pts" },
  { blur: "blur-md", label: "🟠 600 pts" },
  { blur: "blur-none", label: "🔴 300 pts" },
]

// ── ANFITRIÓN ──────────────────────────────────────────────
export function Ronda2Host() {
  const [preguntaIdx, setPreguntaIdx] = useState(0)
  const [nivel, setNivel] = useState(0)
  const [fase, setFase] = useState("jugando") // "jugando" | "resultado"
  const [respuestas, setRespuestas] = useState({})
  const [participantes, setParticipantes] = useState({})
  const timerRef = useRef(null)

  const pregunta = ronda.preguntas[preguntaIdx]
  const esUltima = preguntaIdx === ronda.preguntas.length - 1
  const puntosActuales = ronda.puntosPorNivel[nivel]

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      setParticipantes(snap.val() || {})
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onValue(ref(db, `sala/respuestas/ronda2/p${preguntaIdx}`), snap => {
      setRespuestas(snap.val() || {})
    })
    return () => unsub()
  }, [preguntaIdx])

  // Arrancar pregunta — revelar niveles automáticamente
  useEffect(() => {
    setNivel(0)
    setFase("jugando")
    setRespuestas({})

    // Escribir estado inicial en Firebase
    update(ref(db, "sala/ronda2_estado"), {
      preguntaIdx,
      nivel: 0,
      abierto: true,
      inicio: Date.now(),
      puntos: ronda.puntosPorNivel[0],
    })

    // Revelar nivel 1 → 2 → 3 automáticamente cada 8 segundos
    let nivelActual = 0
    timerRef.current = setInterval(() => {
      nivelActual += 1
      if (nivelActual >= NIVELES.length) {
        clearInterval(timerRef.current)
        // Tiempo agotado — mostrar resultado
        update(ref(db, "sala/ronda2_estado"), { abierto: false })
        setFase("resultado")
        return
      }
      setNivel(nivelActual)
      update(ref(db, "sala/ronda2_estado"), {
        nivel: nivelActual,
        puntos: ronda.puntosPorNivel[nivelActual],
      })
    }, ronda.tiempoPorNivel * 1000)

    return () => clearInterval(timerRef.current)
  }, [preguntaIdx])

  // Si todos respondieron, mostrar resultado automáticamente
  useEffect(() => {
    const total = Object.keys(participantes).length
    const respondieron = Object.keys(respuestas).length
    if (total > 0 && respondieron >= total && fase === "jugando") {
      clearInterval(timerRef.current)
      update(ref(db, "sala/ronda2_estado"), { abierto: false })
      calcularPuntos()
      setFase("resultado")
    }
  }, [respuestas, participantes])

  async function calcularPuntos() {
    const updates = {}
    Object.entries(respuestas).forEach(([userId, data]) => {
      if (data.opcion === pregunta.correcta) {
        const pts = data.puntos || ronda.puntosPorNivel[2]
        updates[`sala/participantes/${userId}/puntaje`] =
          (participantes[userId]?.puntaje || 0) + pts
      }
    })
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates)
    }
  }

  async function mostrarResultado() {
    clearInterval(timerRef.current)
    await update(ref(db, "sala/ronda2_estado"), { abierto: false })
    await calcularPuntos()
    setFase("resultado")
  }

  async function siguientePregunta() {
    await set(ref(db, "sala/ronda2_estado"), null)
    setPreguntaIdx(preguntaIdx + 1)
  }

  const totalParticipantes = Object.keys(participantes).length
  const totalRespondieron = Object.keys(respuestas).length

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-10 py-12">

      {/* Header */}
      <div className="text-center">
        <p className="text-gray-500 text-sm uppercase tracking-widest">
          {ronda.nombre} — Imagen {preguntaIdx + 1} de {ronda.preguntas.length}
        </p>
        {fase === "jugando" && (
          <div className="flex items-center justify-center gap-3 mt-2">
            {NIVELES.map((n, i) => (
              <span
                key={i}
                className={`text-sm px-3 py-1 rounded-full font-bold transition-all ${
                  i === nivel
                    ? "bg-yellow-400 text-gray-950"
                    : i < nivel
                    ? "bg-gray-700 text-gray-500"
                    : "bg-gray-800 text-gray-600"
                }`}
              >
                {n.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl grid grid-cols-2 gap-8 items-start">

        {/* Imagen con blur progresivo */}
        <div className="flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden border border-gray-800 aspect-video bg-gray-900">
            <img
              src={pregunta.imagen}
              alt="Adivina"
              className={`w-full h-full object-cover transition-all duration-1000 ${
                fase === "resultado" ? "blur-none" : NIVELES[nivel].blur
              }`}
            />
            {fase === "jugando" && (
              <div className="absolute top-3 right-3 bg-black/70 rounded-xl px-3 py-1">
                <span className="text-yellow-400 font-bold text-lg">
                  {puntosActuales} pts
                </span>
              </div>
            )}
          </div>

          {/* Progreso de revelación */}
          {fase === "jugando" && (
            <div className="flex gap-2">
              {NIVELES.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    i <= nivel ? "bg-yellow-400" : "bg-gray-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="flex flex-col gap-4">

          {/* Opciones */}
          <div className="grid grid-cols-1 gap-3">
            {pregunta.opciones.map((op, i) => {
              const correcta = fase === "resultado" && i === pregunta.correcta
              const incorrecta = fase === "resultado" && i !== pregunta.correcta
              return (
                <div
                  key={i}
                  className={`rounded-xl px-5 py-3 flex items-center gap-3 border transition-all ${
                    correcta
                      ? "bg-green-500/20 border-green-500 text-green-300"
                      : incorrecta
                      ? "bg-gray-800 border-gray-700 text-gray-500"
                      : "bg-gray-800 border-gray-700 text-white"
                  }`}
                >
                  <span className={`font-bold text-lg w-7 ${correcta ? "text-green-400" : "text-yellow-400"}`}>
                    {LETRAS[i]}
                  </span>
                  <span className="text-base">{op}</span>
                  {correcta && <span className="ml-auto">✅</span>}
                </div>
              )
            })}
          </div>

          {/* Contador respuestas */}
          {fase === "jugando" && (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
              <p className="text-gray-400 text-sm">Respondieron</p>
              <p className="text-white text-3xl font-bold mt-1">
                {totalRespondieron}
                <span className="text-gray-600 text-xl"> / {totalParticipantes}</span>
              </p>
            </div>
          )}

          {/* Resultado */}
          {fase === "resultado" && (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Respuesta correcta:</p>
              <p className="text-green-400 font-bold text-xl">
                {LETRAS[pregunta.correcta]}. {pregunta.opciones[pregunta.correcta]}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {Object.values(respuestas).filter(r => r.opcion === pregunta.correcta).length} acertaron
              </p>
            </div>
          )}

          {/* Botones */}
          {fase === "jugando" && (
            <button
              onClick={mostrarResultado}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-6 py-3 rounded-xl transition text-sm"
            >
              Revelar resultado ahora
            </button>
          )}
          {fase === "resultado" && !esUltima && (
            <button
              onClick={siguientePregunta}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold px-8 py-3 rounded-xl transition"
            >
              Siguiente imagen →
            </button>
          )}
          {fase === "resultado" && esUltima && (
            <button
              onClick={() => update(ref(db, "sala"), { fase: "leaderboard" })}
              className="bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-3 rounded-xl transition"
            >
              Ver resultados 🏆
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PARTICIPANTE ───────────────────────────────────────────
export function Ronda2Player({ userId, nombre }) {
  const [estado, setEstado] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/ronda2_estado"), snap => {
      const data = snap.val()
      setEstado(data)
      if (data?.preguntaIdx !== estado?.preguntaIdx) {
        setSeleccion(null)
        setEnviado(false)
      }
    })
    return () => unsub()
  }, [estado?.preguntaIdx])

  async function handleSeleccion(idx) {
    if (enviado || !estado?.abierto) return
    setSeleccion(idx)
    setEnviado(true)
    await update(ref(db, `sala/respuestas/ronda2/p${estado.preguntaIdx}/${userId}`), {
      opcion: idx,
      nombre,
      puntos: estado.puntos,
      timestamp: Date.now(),
    })
  }

  const pregunta = ronda.preguntas[estado?.preguntaIdx ?? 0]

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-yellow-400">¡Respondiste!</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4">
          <p className="text-gray-400 text-sm">Tu respuesta:</p>
          <p className="text-white text-xl font-bold mt-1">
            {LETRAS[seleccion]}. {pregunta?.opciones[seleccion]}
          </p>
          <p className="text-yellow-400 text-sm mt-2 font-bold">
            Valía {estado?.puntos} pts
          </p>
        </div>
        <p className="text-gray-500 text-sm">Mira la pantalla principal…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-5">
      <div className="text-center">
        <p className="text-gray-500 text-sm">{ronda.nombre}</p>
        <h2 className="text-xl font-bold text-yellow-400 mt-1">
          ¿Qué ves en la imagen?
        </h2>
        <p className="text-gray-500 text-xs mt-1">
          Responde antes — más rápido vale más puntos
        </p>
      </div>

      {/* Indicador de nivel actual */}
      <div className="flex gap-2">
        {ronda.puntosPorNivel.map((pts, i) => (
          <span
            key={i}
            className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
              i === estado?.nivel
                ? "bg-yellow-400 text-gray-950"
                : i < (estado?.nivel ?? 0)
                ? "bg-gray-700 text-gray-500"
                : "bg-gray-800 text-gray-600"
            }`}
          >
            {pts}
          </span>
        ))}
      </div>

      {/* Opciones */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        {pregunta?.opciones.map((op, i) => (
          <button
            key={i}
            onClick={() => handleSeleccion(i)}
            disabled={enviado || !estado?.abierto}
            className="bg-gray-800 hover:bg-gray-700 active:scale-95 border border-gray-700
                       text-white rounded-2xl px-4 py-5 flex flex-col items-center gap-1
                       transition-all disabled:opacity-40 disabled:hover:bg-gray-800
                       disabled:active:scale-100"
          >
            <span className="text-yellow-400 font-bold text-lg">{LETRAS[i]}</span>
            <span className="text-sm text-center leading-tight">{op}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
