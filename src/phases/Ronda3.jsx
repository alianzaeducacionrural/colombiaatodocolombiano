import { useState, useEffect, useRef } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update, set } from "firebase/database"
import { CONFIG } from "../data/actividad.config"

const ronda = CONFIG.rondas[2]
const LETRAS = ["A", "B", "C", "D"]
const COLORES_GRUPO = [
  { bg: "bg-blue-500", border: "border-blue-500", text: "text-blue-400", label: "Grupo Azul 🔵" },
  { bg: "bg-red-500", border: "border-red-500", text: "text-red-400", label: "Grupo Rojo 🔴" },
  { bg: "bg-green-500", border: "border-green-500", text: "text-green-400", label: "Grupo Verde 🟢" },
]

function dividirEnGrupos(participantes) {
  const lista = Object.entries(participantes).map(([id, data]) => ({ id, ...data }))
  // Ordenar por userId para que sea determinista
  lista.sort((a, b) => a.id.localeCompare(b.id))
  const grupos = [[], [], []]
  lista.forEach((p, i) => grupos[i % 3].push(p))
  return grupos
}

function seleccionarRepresentante(grupo, usados) {
  const disponibles = grupo.filter(p => !usados.includes(p.id))
  if (disponibles.length === 0) return null // todos usados → reiniciar
  return disponibles[Math.floor(Math.random() * disponibles.length)]
}

// ── ANFITRIÓN ──────────────────────────────────────────────
export function Ronda3Host() {
  const [preguntaIdx, setPreguntaIdx] = useState(0)
  const [fase, setFase] = useState("jugando") // "jugando" | "resultado"
  const [respuestas, setRespuestas] = useState({})
  const [participantes, setParticipantes] = useState({})
  const [grupos, setGrupos] = useState([[], [], []])
  const [representantes, setRepresentantes] = useState([null, null, null])
  const [usadosPorGrupo, setUsadosPorGrupo] = useState([[], [], []])
  const [tiempo, setTiempo] = useState(ronda.tiempo)
  const timerRef = useRef(null)
  const gruposRef = useRef(null) // grupos fijos: se calculan una sola vez

  const pregunta = ronda.preguntas[preguntaIdx]
  const esUltima = preguntaIdx === ronda.preguntas.length - 1

  // Cargar participantes; los grupos se arman UNA sola vez
  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      const data = snap.val() || {}
      setParticipantes(data)
      if (!gruposRef.current && Object.keys(data).length > 0) {
        const g = dividirEnGrupos(data)
        gruposRef.current = g
        setGrupos(g)
      }
    })
    return () => unsub()
  }, [])

  // Escuchar respuestas
  useEffect(() => {
    const unsub = onValue(ref(db, `sala/respuestas/ronda3/p${preguntaIdx}`), snap => {
      setRespuestas(snap.val() || {})
    })
    return () => unsub()
  }, [preguntaIdx])

  // Iniciar cada pregunta siguiente cuando cambia preguntaIdx (grupos ya fijos)
  useEffect(() => {
    if (gruposRef.current && gruposRef.current.every(g => g.length > 0)) {
      iniciarPregunta(preguntaIdx, usadosPorGrupo)
    }
  }, [preguntaIdx])

  // Arrancar la primera pregunta cuando los grupos se inicializan por primera vez
  useEffect(() => {
    if (grupos.every(g => g.length > 0) && preguntaIdx === 0) {
      iniciarPregunta(0, usadosPorGrupo)
    }
  }, [grupos])

  function iniciarPregunta(idx, usados) {
    clearInterval(timerRef.current)
    setFase("jugando")
    setRespuestas({})
    setTiempo(ronda.tiempo)

    // Seleccionar representantes
    const nuevosReps = grupos.map((grupo, i) => {
      let rep = seleccionarRepresentante(grupo, usados[i])
      if (!rep) {
        // Reiniciar usados de este grupo
        usados[i] = []
        rep = seleccionarRepresentante(grupo, [])
      }
      return rep
    })

    setRepresentantes(nuevosReps)

    // Guardar en Firebase
    const repsIds = nuevosReps.map(r => r?.id ?? null)
    update(ref(db, "sala/ronda3_estado"), {
      preguntaIdx: idx,
      abierto: true,
      inicio: Date.now(),
      representantes: repsIds,
      grupos: grupos.map(g => g.map(p => p.id)),
    })

    // Arrancar timer
    timerRef.current = setInterval(() => {
      setTiempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          mostrarResultado(nuevosReps, usados)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  async function mostrarResultado(reps, usados) {
    clearInterval(timerRef.current)
    await update(ref(db, "sala/ronda3_estado"), { abierto: false })

    // Calcular puntos por grupo
    const puntosGrupo = [0, 0, 0]
    const snap = await new Promise(res => onValue(
      ref(db, `sala/respuestas/ronda3/p${preguntaIdx}`),
      res, { onlyOnce: true }
    ))
    const resps = snap.val() || {}

    reps.forEach((rep, grupoIdx) => {
      if (!rep) return
      const resp = resps[rep.id]
      if (resp?.opcion === pregunta.correcta) {
        puntosGrupo[grupoIdx] = ronda.puntosMax
      }
    })

    // Distribuir puntos del grupo a cada miembro (grupos fijos vía ref)
    const updates = {}
    gruposRef.current.forEach((grupo, gi) => {
      if (puntosGrupo[gi] > 0) {
        grupo.forEach(p => {
          updates[`sala/participantes/${p.id}/puntaje`] =
            (participantes[p.id]?.puntaje || 0) + puntosGrupo[gi]
          updates[`sala/participantes/${p.id}/puntajeGrupo${gi}`] =
            (participantes[p.id]?.[`puntajeGrupo${gi}`] || 0) + puntosGrupo[gi]
        })
      }
    })
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates)
    }

    // Actualizar usados
    const nuevosUsados = usados.map((u, i) => [...u, reps[i]?.id].filter(Boolean))
    setUsadosPorGrupo(nuevosUsados)
    setFase("resultado")
  }

  async function siguientePregunta() {
    await set(ref(db, "sala/ronda3_estado"), null)
    // El efecto [preguntaIdx] inicia la siguiente pregunta
    setPreguntaIdx(preguntaIdx + 1)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-10 py-8">

      {/* Header */}
      <div className="text-center">
        <p className="text-gray-500 text-sm uppercase tracking-widest">
          {ronda.nombre} — Pregunta {preguntaIdx + 1} de {ronda.preguntas.length}
        </p>
      </div>

      {/* Pregunta */}
      <div className="w-full max-w-4xl bg-gray-900 rounded-3xl border border-gray-800 p-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-white text-center">
          {pregunta.texto}
        </h2>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-3">
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
                <span>{op}</span>
                {correcta && <span className="ml-auto">✅</span>}
              </div>
            )
          })}
        </div>

        {/* Timer */}
        {fase === "jugando" && (
          <div className="flex flex-col gap-2">
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${(tiempo / ronda.tiempo) * 100}%` }}
              />
            </div>
            <p className={`text-right text-sm font-bold ${tiempo <= 5 ? "text-red-400" : "text-yellow-400"}`}>
              {tiempo}s
            </p>
          </div>
        )}
      </div>

      {/* Representantes por grupo */}
      <div className="w-full max-w-4xl grid grid-cols-3 gap-4">
        {grupos.map((grupo, gi) => {
          const rep = representantes[gi]
          const color = COLORES_GRUPO[gi]
          const respRep = rep ? respuestas[rep.id] : null
          const acerto = respRep?.opcion === pregunta.correcta
          const respondio = !!respRep

          return (
            <div
              key={gi}
              className={`bg-gray-900 rounded-2xl border-2 ${color.border} p-5 flex flex-col items-center gap-3`}
            >
              <p className={`text-sm font-bold ${color.text}`}>{color.label}</p>

              {/* Representante */}
              <div className="text-center">
                <div className={`w-14 h-14 rounded-full ${color.bg} flex items-center justify-center text-white text-2xl font-bold mx-auto`}>
                  {rep?.nombre?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <p className="text-white font-bold mt-2">{rep?.nombre ?? "—"}</p>
                <p className="text-gray-500 text-xs">responde por el grupo</p>
              </div>

              {/* Estado */}
              {fase === "jugando" && (
                <div className={`text-sm px-3 py-1 rounded-full ${
                  respondio
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-800 text-gray-500"
                }`}>
                  {respondio ? "✅ Respondió" : "⏳ Esperando..."}
                </div>
              )}

              {fase === "resultado" && respondio && (
                <div className={`text-sm px-3 py-1 rounded-full font-bold ${
                  acerto
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {acerto ? `✅ +${ronda.puntosMax} pts` : "❌ Falló"}
                </div>
              )}

              {fase === "resultado" && !respondio && (
                <div className="text-sm px-3 py-1 rounded-full bg-gray-800 text-gray-500">
                  Sin respuesta
                </div>
              )}

              {/* Miembros del grupo */}
              <div className="w-full border-t border-gray-800 pt-3 flex flex-col gap-1">
                {grupo.map(p => (
                  <p key={p.id} className={`text-xs ${p.id === rep?.id ? color.text + " font-bold" : "text-gray-500"}`}>
                    {p.id === rep?.id ? "▶ " : "• "}{p.nombre}
                  </p>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Botones */}
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
            Ver resultados finales 🏆
          </button>
        )}
      </div>
    </div>
  )
}

// ── PARTICIPANTE ───────────────────────────────────────────
export function Ronda3Player({ userId, nombre }) {
  const [estado, setEstado] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [tiempo, setTiempo] = useState(ronda.tiempo)
  const timerRef = useRef(null)

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/ronda3_estado"), snap => {
      const data = snap.val()
      const prevIdx = estado?.preguntaIdx
      setEstado(data)
      if (data?.preguntaIdx !== prevIdx) {
        setSeleccion(null)
        setEnviado(false)
        setTiempo(ronda.tiempo)
      }
    })
    return () => unsub()
  }, [estado?.preguntaIdx])

  // Timer sincronizado
  useEffect(() => {
    if (!estado?.abierto || enviado) return
    const transcurrido = Math.floor((Date.now() - estado.inicio) / 1000)
    const restante = Math.max(0, ronda.tiempo - transcurrido)
    setTiempo(restante)

    timerRef.current = setInterval(() => {
      setTiempo(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [estado?.abierto, enviado])

  async function handleSeleccion(idx) {
    if (enviado || !estado?.abierto) return
    setSeleccion(idx)
    setEnviado(true)
    clearInterval(timerRef.current)
    await update(ref(db, `sala/respuestas/ronda3/p${estado.preguntaIdx}/${userId}`), {
      opcion: idx,
      nombre,
      timestamp: Date.now(),
    })
  }

  const esRepresentante = estado?.representantes?.includes(userId)
  const miGrupoIdx = estado?.grupos?.findIndex(g => g.includes(userId)) ?? -1
  const color = miGrupoIdx >= 0 ? COLORES_GRUPO[miGrupoIdx] : null
  const pregunta = ronda.preguntas[estado?.preguntaIdx ?? 0]

  // No es representante — pantalla de espectador
  if (estado?.abierto && !esRepresentante) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        {color && (
          <div className={`text-sm font-bold px-4 py-2 rounded-full ${color.bg} text-white`}>
            {color.label}
          </div>
        )}
        <div className="text-5xl">👀</div>
        <h2 className="text-2xl font-bold text-white">Esta no te toca</h2>
        <p className="text-gray-400">Tu representante está respondiendo</p>
        <p className="text-gray-600 text-sm">¡Anímalo desde aquí!</p>
      </div>
    )
  }

  // Es representante y ya respondió
  if (esRepresentante && enviado) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-yellow-400">¡Respondiste!</h2>
        {color && <p className={`text-sm font-bold ${color.text}`}>{color.label}</p>}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4">
          <p className="text-gray-400 text-sm">Tu respuesta:</p>
          <p className="text-white text-xl font-bold mt-1">
            {LETRAS[seleccion]}. {pregunta?.opciones[seleccion]}
          </p>
        </div>
        <p className="text-gray-500 text-sm">Espera el resultado en pantalla…</p>
      </div>
    )
  }

  // Es representante — debe responder
  if (esRepresentante && estado?.abierto) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-5">
        <div className="text-center">
          {color && (
            <div className={`text-sm font-bold px-4 py-2 rounded-full ${color.bg} text-white inline-block mb-3`}>
              {color.label}
            </div>
          )}
          <p className="text-yellow-400 font-bold text-lg">⚡ ¡Te toca responder!</p>
          <p className="text-gray-400 text-sm mt-1">Representes a tu grupo</p>
        </div>

        <h2 className="text-xl font-bold text-white text-center px-2">
          {pregunta?.texto}
        </h2>

        {/* Timer */}
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

        {/* Opciones */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-3">
          {pregunta?.opciones.map((op, i) => (
            <button
              key={i}
              onClick={() => handleSeleccion(i)}
              disabled={enviado}
              className="bg-gray-800 hover:bg-gray-700 active:scale-95 border border-gray-700
                         text-white rounded-2xl px-4 py-5 flex flex-col items-center gap-1
                         transition-all disabled:opacity-50"
            >
              <span className="text-yellow-400 font-bold text-lg">{LETRAS[i]}</span>
              <span className="text-sm text-center leading-tight">{op}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Esperando que inicie
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
      {color && (
        <div className={`text-sm font-bold px-4 py-2 rounded-full ${color.bg} text-white`}>
          {color.label}
        </div>
      )}
      <div className="text-5xl animate-pulse">⚡</div>
      <h2 className="text-2xl font-bold text-yellow-400">{ronda.nombre}</h2>
      <p className="text-gray-400">Preparándose para la siguiente pregunta…</p>
    </div>
  )
}
