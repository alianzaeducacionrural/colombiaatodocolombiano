import { useState, useEffect, useRef } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update, set } from "firebase/database"
import { CONFIG } from "../data/actividad.config"

const ronda = CONFIG.rondas[2]
const LETRAS = ["A", "B", "C", "D"]
const COLORES_GRUPO = [
  { bg: "bg-blue-500", border: "border-blue-500", text: "text-blue-400", label: "Grupo Azul 🔵" },
  { bg: "bg-red-500",  border: "border-red-500",  text: "text-red-400",  label: "Grupo Rojo 🔴" },
  { bg: "bg-green-500",border: "border-green-500",text: "text-green-400",label: "Grupo Verde 🟢" },
]

function dividirEnGrupos(participantes) {
  const lista = Object.entries(participantes).map(([id, data]) => ({ id, ...data }))
  lista.sort((a, b) => a.id.localeCompare(b.id))
  const grupos = [[], [], []]
  lista.forEach((p, i) => grupos[i % 3].push(p))
  return grupos
}

function seleccionarRepresentante(grupo, usados) {
  const disponibles = grupo.filter(p => !usados.includes(p.id))
  if (disponibles.length === 0) return null
  return disponibles[Math.floor(Math.random() * disponibles.length)]
}

// ── ANFITRIÓN ──────────────────────────────────────────────
export function Ronda3Host() {
  const [preguntaIdx, setPreguntaIdx] = useState(0)
  const [fase, setFase] = useState("esperando") // "esperando"|"grupos"|"anunciando"|"jugando"|"resultado"
  const [respuestas, setRespuestas] = useState({})
  const [participantes, setParticipantes] = useState({})
  const [grupos, setGrupos] = useState([[], [], []])
  const [representantes, setRepresentantes] = useState([null, null, null])
  const [usadosPorGrupo, setUsadosPorGrupo] = useState([[], [], []])
  const [tiempo, setTiempo] = useState(ronda.tiempo)
  const [cuentaRegresiva, setCuentaRegresiva] = useState(3)
  const timerRef = useRef(null)
  const gruposRef = useRef(null)
  const resueltoRef = useRef(false)

  const pregunta = ronda.preguntas[preguntaIdx]
  const esUltima = preguntaIdx === ronda.preguntas.length - 1

  // Cargar participantes y calcular grupos UNA sola vez
  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      const data = snap.val() || {}
      setParticipantes(data)
      if (!gruposRef.current && Object.keys(data).length > 0) {
        const g = dividirEnGrupos(data)
        gruposRef.current = g
        setGrupos(g)
        set(ref(db, "sala/ronda3_estado"), {
          fase: "grupos",
          preguntaIdx: 0,
          representantes: ["", "", ""],
          grupos: g.map(gr => gr.map(p => p.id)),
          abierto: false,
          inicio: 0,
        })
        setFase("grupos")
      }
    })
    return () => unsub()
  }, [])

  // Escuchar respuestas de la pregunta actual
  useEffect(() => {
    const unsub = onValue(ref(db, `sala/respuestas/ronda3/p${preguntaIdx}`), snap => {
      setRespuestas(snap.val() || {})
    })
    return () => unsub()
  }, [preguntaIdx])

  // Auto-revelar cuando todos los representantes respondieron
  useEffect(() => {
    if (fase !== "jugando") return
    const repsIds = representantes.filter(Boolean).map(r => r.id)
    if (repsIds.length === 0) return
    const respondieron = repsIds.every(id => respuestas[id] !== undefined)
    if (respondieron && !resueltoRef.current) {
      resueltoRef.current = true
      clearInterval(timerRef.current)
      mostrarResultado(representantes, usadosPorGrupo, preguntaIdx)
    }
  }, [respuestas, fase, representantes, preguntaIdx, usadosPorGrupo])

  function arrancarPregunta(reps, idx, usados) {
    clearInterval(timerRef.current)
    resueltoRef.current = false
    setFase("jugando")
    setRespuestas({})
    setTiempo(ronda.tiempo)

    const inicio = Date.now()
    update(ref(db, "sala/ronda3_estado"), { fase: "jugando", abierto: true, inicio })

    timerRef.current = setInterval(() => {
      setTiempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          if (!resueltoRef.current) {
            resueltoRef.current = true
            mostrarResultado(reps, usados, idx)
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  async function mostrarResultado(reps, usados, idx) {
    await update(ref(db, "sala/ronda3_estado"), { abierto: false, fase: "resultado" })

    const snap = await new Promise(res =>
      onValue(ref(db, `sala/respuestas/ronda3/p${idx}`), res, { onlyOnce: true })
    )
    const resps = snap.val() || {}
    const preg = ronda.preguntas[idx]

    const puntosGrupo = [0, 0, 0]
    reps.forEach((rep, gi) => {
      if (rep && resps[rep.id]?.opcion === preg.correcta) puntosGrupo[gi] = ronda.puntosMax
    })

    const partSnap = await new Promise(res =>
      onValue(ref(db, "sala/participantes"), res, { onlyOnce: true })
    )
    const partActual = partSnap.val() || {}

    const updates = {}
    gruposRef.current.forEach((grupo, gi) => {
      if (puntosGrupo[gi] > 0) {
        grupo.forEach(p => {
          updates[`sala/participantes/${p.id}/puntaje`] =
            (partActual[p.id]?.puntaje || 0) + puntosGrupo[gi]
        })
      }
    })
    if (Object.keys(updates).length > 0) await update(ref(db), updates)

    const nuevosUsados = usados.map((u, i) => [...u, reps[i]?.id].filter(Boolean))
    setUsadosPorGrupo(nuevosUsados)
    setFase("resultado")
  }

  function iniciarConCuentaRegresiva(reps, idx, usados) {
    let cuenta = 3
    setCuentaRegresiva(cuenta)
    const iv = setInterval(() => {
      cuenta -= 1
      if (cuenta <= 0) {
        clearInterval(iv)
        arrancarPregunta(reps, idx, usados)
      } else {
        setCuentaRegresiva(cuenta)
      }
    }, 1000)
  }

  function iniciarRonda() {
    const g = gruposRef.current
    const usados = [[], [], []]
    const reps = g.map((grupo, i) => seleccionarRepresentante(grupo, usados[i]) || grupo[0])
    setRepresentantes(reps)
    setUsadosPorGrupo(usados)

    update(ref(db, "sala/ronda3_estado"), {
      fase: "anunciando",
      preguntaIdx: 0,
      representantes: reps.map(r => r?.id ?? ""),
      abierto: false,
    })
    setFase("anunciando")
    iniciarConCuentaRegresiva(reps, 0, usados)
  }

  async function siguientePregunta() {
    const nextIdx = preguntaIdx + 1
    const g = gruposRef.current
    const usados = usadosPorGrupo

    const reps = g.map((grupo, i) => {
      let rep = seleccionarRepresentante(grupo, usados[i])
      if (!rep) { usados[i] = []; rep = seleccionarRepresentante(grupo, []) || grupo[0] }
      return rep
    })
    setRepresentantes(reps)
    setPreguntaIdx(nextIdx)

    await update(ref(db, "sala/ronda3_estado"), {
      fase: "anunciando",
      preguntaIdx: nextIdx,
      representantes: reps.map(r => r?.id ?? ""),
      abierto: false,
    })
    setFase("anunciando")
    iniciarConCuentaRegresiva(reps, nextIdx, usados)
  }

  const respondieronReps = representantes.filter(r => r && respuestas[r.id]).length
  const totalReps = representantes.filter(Boolean).length

  // ─── GRUPOS ────────────────────────────────────────────────
  if (fase === "esperando" || fase === "grupos") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-8 px-10 py-12">
        <div className="text-center">
          <p className="text-gray-500 text-sm uppercase tracking-widest">{ronda.nombre}</p>
          <h2 className="text-3xl font-bold text-yellow-400 mt-2">Grupos formados</h2>
        </div>

        <div className="w-full max-w-4xl grid grid-cols-3 gap-4">
          {grupos.map((grupo, gi) => {
            const color = COLORES_GRUPO[gi]
            return (
              <div key={gi} className={`bg-gray-900 rounded-2xl border-2 ${color.border} p-5 flex flex-col items-center gap-3`}>
                <p className={`text-sm font-bold ${color.text}`}>{color.label}</p>
                <div className="w-full flex flex-col gap-2">
                  {grupo.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
                      <div className={`w-7 h-7 rounded-full ${color.bg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {p.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm">{p.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {fase === "grupos" && (
          <button
            onClick={iniciarRonda}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-xl px-10 py-4 rounded-2xl transition-all hover:scale-105"
          >
            ⚡ Iniciar ronda
          </button>
        )}
      </div>
    )
  }

  // ─── ANUNCIANDO ────────────────────────────────────────────
  if (fase === "anunciando") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-8 px-10 py-12">
        <p className="text-gray-500 text-sm uppercase tracking-widest">
          {ronda.nombre} — Pregunta {preguntaIdx + 1} de {ronda.preguntas.length}
        </p>
        <h2 className="text-3xl font-bold text-yellow-400">¡Prepárense!</h2>
        <div className="text-9xl font-black text-yellow-400 tabular-nums">{cuentaRegresiva}</div>

        <div className="w-full max-w-4xl grid grid-cols-3 gap-4">
          {grupos.map((_, gi) => {
            const color = COLORES_GRUPO[gi]
            const rep = representantes[gi]
            return (
              <div key={gi} className={`bg-gray-900 rounded-2xl border-2 ${color.border} p-5 text-center`}>
                <p className={`text-sm font-bold ${color.text} mb-3`}>{color.label}</p>
                <div className={`w-14 h-14 rounded-full ${color.bg} flex items-center justify-center text-white text-2xl font-bold mx-auto`}>
                  {rep?.nombre?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <p className="text-white font-bold mt-2">{rep?.nombre ?? "—"}</p>
                <p className="text-gray-500 text-xs mt-1">⚡ Va a responder</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── JUGANDO / RESULTADO ────────────────────────────────────
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 px-10 py-8">
      <div className="text-center">
        <p className="text-gray-500 text-sm uppercase tracking-widest">
          {ronda.nombre} — Pregunta {preguntaIdx + 1} de {ronda.preguntas.length}
        </p>
      </div>

      <div className="w-full max-w-4xl bg-gray-900 rounded-3xl border border-gray-800 p-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-white text-center">{pregunta.texto}</h2>

        <div className="grid grid-cols-2 gap-3">
          {pregunta.opciones.map((op, i) => {
            const correcta = fase === "resultado" && i === pregunta.correcta
            const incorrecta = fase === "resultado" && i !== pregunta.correcta
            return (
              <div
                key={i}
                className={`rounded-xl px-5 py-3 flex items-center gap-3 border transition-all ${
                  correcta   ? "bg-green-500/20 border-green-500 text-green-300"
                  : incorrecta ? "bg-gray-800 border-gray-700 text-gray-500"
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

        {fase === "jugando" && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{respondieronReps} de {totalReps} respondieron</span>
              <span className={`text-2xl font-black ${tiempo <= 5 ? "text-red-400" : "text-yellow-400"}`}>{tiempo}s</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${(tiempo / ronda.tiempo) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl grid grid-cols-3 gap-4">
        {grupos.map((grupo, gi) => {
          const rep = representantes[gi]
          const color = COLORES_GRUPO[gi]
          const respRep = rep ? respuestas[rep.id] : null
          const acerto = respRep?.opcion === pregunta.correcta
          const respondio = !!respRep
          return (
            <div key={gi} className={`bg-gray-900 rounded-2xl border-2 ${color.border} p-5 flex flex-col items-center gap-3`}>
              <p className={`text-sm font-bold ${color.text}`}>{color.label}</p>
              <div className="text-center">
                <div className={`w-14 h-14 rounded-full ${color.bg} flex items-center justify-center text-white text-2xl font-bold mx-auto`}>
                  {rep?.nombre?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <p className="text-white font-bold mt-2">{rep?.nombre ?? "—"}</p>
                <p className="text-gray-500 text-xs">responde por el grupo</p>
              </div>

              {fase === "jugando" && (
                <div className={`text-sm px-3 py-1 rounded-full ${respondio ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                  {respondio ? "✅ Respondió" : "⏳ Esperando..."}
                </div>
              )}
              {fase === "resultado" && (
                <div className={`text-sm px-3 py-1 rounded-full font-bold ${
                  respondio && acerto  ? "bg-green-500/20 text-green-400"
                  : respondio         ? "bg-red-500/20 text-red-400"
                  : "bg-gray-800 text-gray-500"
                }`}>
                  {respondio ? (acerto ? `✅ +${ronda.puntosMax} pts` : "❌ Falló") : "Sin respuesta"}
                </div>
              )}

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

      <div className="flex gap-3">
        {fase === "jugando" && (
          <button
            onClick={() => {
              if (!resueltoRef.current) {
                resueltoRef.current = true
                clearInterval(timerRef.current)
                mostrarResultado(representantes, usadosPorGrupo, preguntaIdx)
              }
            }}
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
      setEstado(prev => {
        // Reset al cambiar pregunta o volver a "anunciando"
        if (data?.preguntaIdx !== prev?.preguntaIdx || data?.fase === "anunciando") {
          setSeleccion(null)
          setEnviado(false)
        }
        return data
      })
    })
    return () => unsub()
  }, [])

  // Timer sincronizado con estado.inicio
  useEffect(() => {
    if (!estado?.abierto || !estado?.inicio || enviado) return
    clearInterval(timerRef.current)
    const calc = () => Math.max(0, ronda.tiempo - Math.floor((Date.now() - estado.inicio) / 1000))
    setTiempo(calc())
    timerRef.current = setInterval(() => {
      const t = calc()
      setTiempo(t)
      if (t <= 0) clearInterval(timerRef.current)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [estado?.abierto, estado?.inicio, enviado])

  async function handleSeleccion(idx) {
    if (enviado || !estado?.abierto) return
    setSeleccion(idx)
    setEnviado(true)
    clearInterval(timerRef.current)
    await update(ref(db, `sala/respuestas/ronda3/p${estado.preguntaIdx}/${userId}`), {
      opcion: idx, nombre, timestamp: Date.now(),
    })
  }

  const faseEstado = estado?.fase
  const esRepresentante = Array.isArray(estado?.representantes) && estado.representantes.includes(userId)
  const miGrupoIdx = estado?.grupos?.findIndex(g => Array.isArray(g) && g.includes(userId)) ?? -1
  const color = miGrupoIdx >= 0 ? COLORES_GRUPO[miGrupoIdx] : null
  const pregunta = ronda.preguntas[estado?.preguntaIdx ?? 0]

  const BadgeGrupo = () => color ? (
    <div className={`text-sm font-bold px-4 py-2 rounded-full ${color.bg} text-white`}>{color.label}</div>
  ) : null

  // GRUPOS — esperando al anfitrión
  if (!faseEstado || faseEstado === "grupos") {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <BadgeGrupo />
        <div className="text-5xl animate-pulse">⏳</div>
        <h2 className="text-2xl font-bold text-yellow-400">{ronda.nombre}</h2>
        <p className="text-gray-400">Espera, el anfitrión está por iniciar la ronda</p>
      </div>
    )
  }

  // ANUNCIANDO
  if (faseEstado === "anunciando") {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <BadgeGrupo />
        {esRepresentante ? (
          <>
            <div className="text-5xl animate-bounce">⚡</div>
            <h2 className="text-2xl font-bold text-yellow-400">¡Prepárate, vas a responder!</h2>
            <p className="text-gray-400">Representas a tu grupo en esta pregunta</p>
          </>
        ) : (
          <>
            <div className="text-5xl">👀</div>
            <h2 className="text-2xl font-bold text-white">Observa quién responde por tu grupo</h2>
            <p className="text-gray-400">Tu representante está a punto de responder</p>
          </>
        )}
      </div>
    )
  }

  // RESULTADO
  if (faseEstado === "resultado") {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <BadgeGrupo />
        <div className="text-5xl">📊</div>
        <h2 className="text-2xl font-bold text-yellow-400">Resultado</h2>
        {enviado ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4">
            <p className="text-gray-400 text-sm">Tu respuesta:</p>
            <p className="text-white text-xl font-bold mt-1">
              {LETRAS[seleccion]}. {pregunta?.opciones[seleccion]}
            </p>
          </div>
        ) : (
          <p className="text-gray-400">Mira los resultados en la pantalla principal</p>
        )}
        <p className="text-gray-500 text-sm">Espera al anfitrión para continuar…</p>
      </div>
    )
  }

  // JUGANDO — no es representante
  if (faseEstado === "jugando" && !esRepresentante) {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <BadgeGrupo />
        <div className="text-5xl">👀</div>
        <h2 className="text-2xl font-bold text-white">Esta no te toca</h2>
        <p className="text-gray-400">Tu representante está respondiendo</p>
        <div className="w-full max-w-sm mt-2">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(tiempo / ronda.tiempo) * 100}%` }}
            />
          </div>
          <p className={`text-right text-sm mt-1 font-bold ${tiempo <= 5 ? "text-red-400" : "text-yellow-400"}`}>{tiempo}s</p>
        </div>
      </div>
    )
  }

  // JUGANDO — es representante y ya respondió
  if (faseEstado === "jugando" && esRepresentante && enviado) {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-yellow-400">¡Respondiste!</h2>
        <BadgeGrupo />
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

  // JUGANDO — es representante — debe responder
  if (faseEstado === "jugando" && esRepresentante) {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-5 px-5">
        <div className="text-center">
          <BadgeGrupo />
          <p className="text-yellow-400 font-bold text-lg mt-3">⚡ ¡Te toca responder!</p>
          <p className="text-gray-400 text-sm">Representas a tu grupo</p>
        </div>

        <h2 className="text-xl font-bold text-white text-center px-2">{pregunta?.texto}</h2>

        <div className="w-full max-w-sm">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(tiempo / ronda.tiempo) * 100}%` }}
            />
          </div>
          <p className={`text-right text-sm mt-1 font-bold ${tiempo <= 5 ? "text-red-400" : "text-yellow-400"}`}>{tiempo}s</p>
        </div>

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

  // Fallback
  return (
    <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <BadgeGrupo />
      <div className="text-5xl animate-pulse">⚡</div>
      <h2 className="text-2xl font-bold text-yellow-400">{ronda.nombre}</h2>
      <p className="text-gray-400">Preparándose…</p>
    </div>
  )
}
