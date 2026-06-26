import { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update } from "firebase/database"

const MEDALLAS = ["🥇", "🥈", "🥉"]
const COLORES_PODIO = [
  "bg-yellow-400 text-gray-950",
  "bg-gray-300 text-gray-950",
  "bg-amber-600 text-white",
]

export function LeaderboardHost() {
  const [participantes, setParticipantes] = useState([])

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      const data = snap.val() || {}
      const lista = Object.entries(data)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0))
      setParticipantes(lista)
    })
    return () => unsub()
  }, [])

  const top3 = participantes.slice(0, 3)
  const resto = participantes.slice(3)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-10 py-12">
      <div className="text-center">
        <h2 className="text-5xl font-bold text-yellow-400">🏆 Tabla de Líderes</h2>
        <p className="text-gray-400 mt-2">Resultados finales</p>
      </div>

      {/* Podio top 3 */}
      <div className="flex items-end gap-4 justify-center">
        {[top3[1], top3[0], top3[2]].map((p, i) => {
          if (!p) return <div key={i} className="w-36" />
          const posReal = i === 0 ? 1 : i === 1 ? 0 : 2
          const alturas = ["h-32", "h-44", "h-24"]
          return (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{MEDALLAS[posReal]}</span>
              <p className="text-white font-bold text-center">{p.nombre}</p>
              <p className="text-yellow-400 font-bold">{p.puntaje || 0} pts</p>
              <div className={`w-36 ${alturas[i]} ${COLORES_PODIO[posReal]}
                              rounded-t-2xl flex items-center justify-center text-4xl font-black`}>
                {posReal + 1}
              </div>
            </div>
          )
        })}
      </div>

      {/* Resto */}
      {resto.length > 0 && (
        <div className="w-full max-w-md flex flex-col gap-2">
          {resto.map((p, i) => (
            <div key={p.id}
              className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3
                         flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-bold w-6">{i + 4}</span>
                <span className="text-white font-medium">{p.nombre}</span>
              </div>
              <span className="text-yellow-400 font-bold">{p.puntaje || 0} pts</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => update(ref(db, "sala"), { fase: "evaluacion" })}
        className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold
                   text-xl px-12 py-4 rounded-2xl transition-all hover:scale-105"
      >
        Continuar a Evaluación →
      </button>
    </div>
  )
}

export function LeaderboardPlayer({ userId }) {
  const [participantes, setParticipantes] = useState([])

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/participantes"), snap => {
      const data = snap.val() || {}
      const lista = Object.entries(data)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0))
      setParticipantes(lista)
    })
    return () => unsub()
  }, [])

  const miPosicion = participantes.findIndex(p => p.id === userId) + 1
  const miPuntaje = participantes.find(p => p.id === userId)?.puntaje || 0

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center
                    justify-center gap-6 px-6 text-center">
      <h2 className="text-3xl font-bold text-yellow-400">🏆 Resultados</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8
                      flex flex-col items-center gap-2">
        <p className="text-gray-400 text-sm">Tu posición</p>
        <p className="text-6xl font-black text-yellow-400">#{miPosicion}</p>
        <p className="text-white text-2xl font-bold">{miPuntaje} pts</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2">
        {participantes.slice(0, 5).map((p, i) => (
          <div key={p.id}
            className={`rounded-xl px-4 py-3 flex items-center justify-between
                        ${p.id === userId
                          ? "bg-yellow-400/20 border border-yellow-400"
                          : "bg-gray-900 border border-gray-800"}`}>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 w-5 text-sm">{i + 1}</span>
              <span className={`font-medium ${p.id === userId ? "text-yellow-400" : "text-white"}`}>
                {p.nombre}
              </span>
            </div>
            <span className={`font-bold text-sm ${p.id === userId ? "text-yellow-400" : "text-gray-400"}`}>
              {p.puntaje || 0} pts
            </span>
          </div>
        ))}
      </div>

      <p className="text-gray-600 text-sm">Mira la pantalla principal</p>
    </div>
  )
}
