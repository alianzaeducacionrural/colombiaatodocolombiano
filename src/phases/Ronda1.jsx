import { useState, useEffect, useRef } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update, get } from "firebase/database"
import { CONFIG } from "../data/actividad.config"

const ronda = CONFIG.rondas[0]
const LETRAS = ["A", "B", "C", "D"]

// ── ANFITRIÓN ──────────────────────────────────────────────
export function Ronda1Host() {
  const [preguntaIdx, setPreguntaIdx] = useState(0)
  const [pistaIdx, setPistaIdx] = useState(0)
  const [tiempo, setTiempo] = useState(ronda.tiempo)
  const [fase, setFase] = useState("respondiendo") // "respondiendo" | "resultado"
  const [respuestas, setRespuestas] = useState({})
  const [participantes, setParticipantes] = useState({})
  const timerRef = useRef(null)
  const resueltoRef = useRef(false) // evita puntuar dos veces la misma pregunta

  const pregunta = ronda.preguntas[preguntaIdx]
  const esUltima = preguntaIdx === ronda.preguntas.length - 1

  // Escuchar participantes
  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      setParticipantes(snap.val() || {})
    })
    return () => unsub()
  }, [])

  // Al montar: abrir la pregunta inicial desde el primer segundo
  useEffect(() => {
    update(ref(db, "sala/ronda1_estado"), {
      preguntaIdx: 0,
      abierto: true,
      inicio: Date.now(),
    })
  }, [])

  // Escuchar respuestas de la pregunta actual
  useEffect(() => {
    const unsub = onValue(ref(db, `sala/respuestas/ronda1/p${preguntaIdx}`), snap => {
      setRespuestas(snap.val() || {})
    })
    return () => unsub()
  }, [preguntaIdx])

  // Timer: arranca al cambiar de pregunta; al llegar a 0 → resultado
  useEffect(() => {
    resueltoRef.current = false
    setFase("respondiendo")
    setTiempo(ronda.tiempo)
    setRespuestas({})
    timerRef.current = setInterval(() => {
      setTiempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          mostrarResultado()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [preguntaIdx])

  // Revelar pistas automáticamente cada 4s, en paralelo al timer
  useEffect(() => {
    setPistaIdx(0)
    const intervalo = setInterval(() => {
      setPistaIdx(prev => {
        if (prev >= pregunta.pistas.length - 1) {
          clearInterval(intervalo)
          return prev
        }
        return prev + 1
      })
    }, 4000)
    return () => clearInterval(intervalo)
  }, [preguntaIdx])

  async function mostrarResultado() {
    if (resueltoRef.current) return // ya se resolvió esta pregunta
    resueltoRef.current = true
    clearInterval(timerRef.current)
    await update(ref(db, "sala/ronda1_estado"), { abierto: false })

    // Leer datos frescos de Firebase (evita el closure obsoleto del timer)
    const [respSnap, partSnap, estadoSnap] = await Promise.all([
      get(ref(db, `sala/respuestas/ronda1/p${preguntaIdx}`)),
      get(ref(db, "sala/participantes")),
      get(ref(db, "sala/ronda1_estado")),
    ])
    const respFresh = respSnap.val() || {}
    const partFresh = partSnap.val() || {}
    const inicio = estadoSnap.val()?.inicio ?? (Date.now() - ronda.tiempo * 1000)
    const correcta = pregunta.correcta

    const updates = {}
    Object.entries(respFresh).forEach(([userId, data]) => {
      if (data.opcion === correcta) {
        const tardanza = Math.min((data.timestamp - inicio) / 1000, ronda.tiempo)
        const pts = Math.round(ronda.puntosMax * (1 - tardanza / ronda.tiempo) * 0.8 + ronda.puntosMax * 0.2)
        updates[`sala/participantes/${userId}/puntaje`] =
          (partFresh[userId]?.puntaje || 0) + pts
      }
    })
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates)
    }
    setFase("resultado")
  }

  async function siguientePregunta() {
    // El efecto [preguntaIdx] reinicia fase, timer y respuestas
    await update(ref(db, "sala/ronda1_estado"), {
      preguntaIdx: preguntaIdx + 1,
      abierto: true,
      inicio: Date.now(),
    })
    setPreguntaIdx(preguntaIdx + 1)
  }

  const totalParticipantes = Object.keys(participantes).length
  const totalRespondieron = Object.keys(respuestas).length

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-10 py-12">

      {/* Header */}
      <div className="text-center">
        <p className="text-gray-500 text-sm uppercase tracking-widest">
          {ronda.nombre} — Pregunta {preguntaIdx + 1} de {ronda.preguntas.length}
        </p>
      </div>

      {/* Tarjeta principal */}
      <div className="w-full max-w-3xl bg-gray-900 rounded-3xl border border-gray-800 p-10 flex flex-col items-center gap-6">

        {/* Silueta */}
        <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-yellow-400 flex items-center justify-center text-6xl">
          🕵️
        </div>

        {/* Pistas */}
        <div className="w-full flex flex-col gap-3">
          {pregunta.pistas.map((pista, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl px-5 py-3 transition-all duration-500 ${
                i <= pistaIdx
                  ? "bg-yellow-400/10 border border-yellow-400/30 opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <span className="text-yellow-400 font-bold text-sm w-6">{i + 1}.</span>
              <p className="text-white text-lg">{pista}</p>
            </div>
          ))}
        </div>

        {/* Opciones — siempre visibles; solo se colorean en fase "resultado" */}
        <div className="w-full grid grid-cols-2 gap-3 mt-2">
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

        {/* Timer */}
        {fase === "respondiendo" && (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${(tiempo / ronda.tiempo) * 100}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-sm">
              <span className="text-gray-400">
                {totalRespondieron} de {totalParticipantes} respondieron
              </span>
              <span className={`font-bold ${tiempo <= 5 ? "text-red-400" : "text-yellow-400"}`}>
                {tiempo}s
              </span>
            </div>
          </div>
        )}

        {/* Resultado */}
        {fase === "resultado" && (
          <div className="bg-gray-800 rounded-2xl p-4 w-full">
            <p className="text-gray-400 text-sm mb-2">Respuesta correcta:</p>
            <p className="text-green-400 font-bold text-xl">
              {LETRAS[pregunta.correcta]}. {pregunta.opciones[pregunta.correcta]}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {Object.values(respuestas).filter(r => r.opcion === pregunta.correcta).length} acertaron
            </p>
          </div>
        )}
      </div>

      {/* Botones de control */}
      <div className="flex gap-3">
        {fase === "resultado" && !esUltima && (
          <button
            onClick={siguientePregunta}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold px-8 py-3 rounded-xl transition"
          >
            Siguiente pregunta →
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
  )
}

// ── PARTICIPANTE ───────────────────────────────────────────
export function Ronda1Player({ userId, nombre, enviarRespuesta }) {
  const [estado, setEstado] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [tiempo, setTiempo] = useState(ronda.tiempo)
  const timerRef = useRef(null)

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/ronda1_estado"), snap => {
      setEstado(snap.val())
    })
    return () => unsub()
  }, [])

  // Reinicia la selección al cambiar de pregunta
  useEffect(() => {
    setSeleccion(null)
    setEnviado(false)
  }, [estado?.preguntaIdx])

  // Timer sincronizado con el host vía estado.inicio (arranca con las pistas)
  useEffect(() => {
    if (!estado?.inicio) return
    const tick = () => {
      const transcurrido = Math.floor((Date.now() - estado.inicio) / 1000)
      const restante = Math.max(0, ronda.tiempo - transcurrido)
      setTiempo(restante)
      if (restante <= 0) clearInterval(timerRef.current)
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [estado?.inicio])

  async function handleSeleccion(idx) {
    if (enviado || !estado?.abierto) return
    setSeleccion(idx)
    setEnviado(true)
    clearInterval(timerRef.current)
    await update(ref(db, `sala/respuestas/ronda1/p${estado.preguntaIdx}/${userId}`), {
      opcion: idx,
      nombre,
      timestamp: Date.now(),
    })
  }

  // Ya respondió
  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-yellow-400">¡Respondiste!</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4">
          <p className="text-gray-400 text-sm">Tu respuesta:</p>
          <p className="text-white text-xl font-bold mt-1">
            {LETRAS[seleccion]}. {ronda.preguntas[estado?.preguntaIdx]?.opciones[seleccion]}
          </p>
        </div>
        <p className="text-gray-500 text-sm">Espera el resultado en pantalla…</p>
      </div>
    )
  }

  // Pistas (opciones deshabilitadas) o respondiendo (habilitadas)
  const pregunta = ronda.preguntas[estado?.preguntaIdx ?? 0]
  const habilitado = estado?.abierto === true
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-5">
      <div className="text-center">
        <p className="text-gray-500 text-sm">{ronda.nombre}</p>
        <h2 className="text-xl font-bold text-yellow-400 mt-1">¿Quién es?</h2>
      </div>

      {/* Timer sincronizado, visible desde las pistas */}
      <div className="w-full max-w-sm">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(tiempo / ronda.tiempo) * 100}%` }}
          />
        </div>
        <p className={`text-right text-sm mt-1 font-bold ${tiempo <= 5 ? "text-red-400" : "text-yellow-400"}`}>
          {tiempo}s
        </p>
      </div>
      {!habilitado && (
        <p className="text-gray-500 text-sm text-center">Observa las pistas en la pantalla principal…</p>
      )}

      {/* Opciones — visibles siempre, habilitadas solo cuando abierto */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3">
        {pregunta?.opciones.map((op, i) => (
          <button
            key={i}
            onClick={() => handleSeleccion(i)}
            disabled={!habilitado || enviado}
            className="bg-gray-800 hover:bg-gray-700 active:scale-95 border border-gray-700
                       text-white rounded-2xl px-4 py-5 flex flex-col items-center gap-1
                       transition-all disabled:opacity-50 disabled:hover:bg-gray-800 disabled:active:scale-100"
          >
            <span className="text-yellow-400 font-bold text-lg">{LETRAS[i]}</span>
            <span className="text-sm text-center leading-tight">{op}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
