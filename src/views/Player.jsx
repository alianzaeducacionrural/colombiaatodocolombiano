import { useState, useEffect } from "react"
import { db } from "../config/firebase"
import { ref, onValue } from "firebase/database"
import { useParticipante } from "../hooks/useParticipante"
import { ReflexionPlayer } from "../phases/Reflexion"
import { InstrumentoPlayer } from "../phases/Instrumento"
import { Ronda1Player } from "../phases/Ronda1"
import { Ronda2Player } from "../phases/Ronda2"
import { Ronda3Player } from "../phases/Ronda3"
import { LeaderboardPlayer } from "../phases/Leaderboard"
import { EvaluacionPlayer } from "../phases/Evaluacion"
import { PreFasePlayer } from "../phases/PreFase"

export default function Player() {
  const { faseActual, registrado, registrarme, enviarRespuesta, nombre, userId } = useParticipante()
  const [nombreInput, setNombreInput] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const [enPrefase, setEnPrefase] = useState(false)

  useEffect(() => {
    const unsub = onValue(ref(db, "sala/prefase_activa"), snap => {
      setEnPrefase(snap.val() === true)
    })
    return () => unsub()
  }, [])

  async function handleRegistro() {
    const nombre = nombreInput.trim()
    if (!nombre) {
      setError("Por favor escribe tu nombre")
      return
    }
    if (nombre.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres")
      return
    }
    setEnviando(true)
    await registrarme(nombre)
    setEnviando(false)
  }

  // Pantalla de registro — antes de unirse
  if (!registrado) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center px-6 gap-5">
        <div className="text-center flex flex-col gap-2 mb-2">
          <p className="text-gray-400 text-base leading-relaxed">
            Bienvenidos equipo de padrinos a las
          </p>
          <h2 className="text-2xl font-bold text-white">
            Actividades de Conjunto
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-yellow-400 text-xl">✦</span>
            <p className="text-yellow-400 font-bold text-xl tracking-wide">
              Colombia a Todo Colombiano
            </p>
            <span role="img" aria-label="Colombia">🇨🇴</span>
            <span className="text-yellow-400 text-xl">✦</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 w-full max-w-sm flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white text-center">¿Cómo te llamas?</h2>

          <input
            type="text"
            placeholder="Escribe tu nombre..."
            value={nombreInput}
            onChange={(e) => {
              setNombreInput(e.target.value)
              setError("")
            }}
            onKeyDown={(e) => e.key === "Enter" && handleRegistro()}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-lg outline-none focus:border-yellow-400 transition placeholder-gray-500"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleRegistro}
            disabled={enviando}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-950 font-bold text-lg py-3 rounded-xl transition"
          >
            {enviando ? "Uniéndome..." : "¡Entrar!"}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center">
          Al unirte aparecerás en la pantalla del anfitrión
        </p>
      </div>
    )
  }

  // Prefase activa — mostrar instrucciones de la siguiente fase
  if (enPrefase) {
    return (
      <div className="h-screen bg-gray-950 text-white font-sans">
        <PreFasePlayer fase={faseActual} />
      </div>
    )
  }

  // Fase de reflexión: ReflexionPlayer ya trae su propio layout de pantalla completa
  if (faseActual === "reflexion") {
    return <ReflexionPlayer enviarRespuesta={enviarRespuesta} />
  }

  // Pantallas según la fase actual
  return (
    <div className="h-screen bg-gray-950 text-white font-sans overflow-y-auto">
      {faseActual === "lobby" && (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl animate-bounce">🎮</div>
          <h2 className="text-2xl font-bold text-yellow-400">¡Ya estás dentro!</h2>
          <p className="text-gray-400">Espera a que el anfitrión inicie la actividad...</p>
        </div>
      )}

      {faseActual === "instrumento" && (
        <InstrumentoPlayer
          enviarRespuesta={enviarRespuesta}
          nombre={nombre}
          userId={userId}
        />
      )}
      {faseActual === "juego_ronda1" && (
        <Ronda1Player
          userId={userId}
          nombre={nombre}
          enviarRespuesta={enviarRespuesta}
        />
      )}
      {faseActual === "juego_ronda2" && (
        <Ronda2Player
          userId={userId}
          nombre={nombre}
        />
      )}
      {faseActual === "juego_ronda3" && (
        <Ronda3Player
          userId={userId}
          nombre={nombre}
        />
      )}
      {(faseActual === "leaderboard_parcial_1" || faseActual === "leaderboard_parcial_2") && (
        <LeaderboardPlayer userId={userId} />
      )}
      {faseActual === "leaderboard" && (
        <LeaderboardPlayer userId={userId} />
      )}
      {faseActual === "evaluacion" && (
        <EvaluacionPlayer userId={userId} nombre={nombre} />
      )}
      {faseActual === "fin" && (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-yellow-400">¡Gracias por participar!</h2>
          <p className="text-gray-400">Hasta la próxima actividad de conjunto</p>
        </div>
      )}
    </div>
  )
}
