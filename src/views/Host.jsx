import { useSala } from "../hooks/useSala"
import { CONFIG } from "../data/actividad.config"
import { QRCodeSVG as QRCode } from "qrcode.react"
import { ReflexionHost } from "../phases/Reflexion"
import { InstrumentoHost } from "../phases/Instrumento"
import { Ronda1Host } from "../phases/Ronda1"
import { Ronda2Host } from "../phases/Ronda2"
import { Ronda3Host } from "../phases/Ronda3"
import { LeaderboardHost } from "../phases/Leaderboard"
import { EvaluacionHost } from "../phases/Evaluacion"

export default function Host() {
  const { sala, cargando, iniciarSala, siguienteFase, faseAnterior, resetSala, activarReflexion, avanzarSocializacion } = useSala()

  if (cargando) return <Cargando />

  const participantes = sala?.participantes
    ? Object.values(sala.participantes)
    : []

  function handleReiniciar() {
    if (window.confirm("¿Reiniciar la actividad? Esto borrará las respuestas y los participantes tendrán que volver a registrarse.")) {
      iniciarSala()
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* Barra de control del anfitrión */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-6 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          {sala?.fase !== undefined && (
            <button
              onClick={handleReiniciar}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              ↺ Reiniciar
            </button>
          )}
          <span className="text-gray-400 text-sm">Fase actual:</span>
          <span className="bg-yellow-400 text-gray-950 text-sm font-bold px-3 py-1 rounded-full">
            {sala?.fase ?? "—"}
          </span>
          <span className="text-gray-500 text-sm">
            👥 {participantes.length} participante{participantes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-3">
          {sala?.fase && (
            <button
              onClick={sala.fase === "lobby" ? resetSala : faseAnterior}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              ← Anterior
            </button>
          )}
          {!sala || sala.fase === undefined ? (
            <button
              onClick={iniciarSala}
              className="bg-green-500 hover:bg-green-400 text-white px-6 py-2 rounded-xl text-sm font-bold transition"
            >
              Inicializar sala
            </button>
          ) : (
            <button
              onClick={siguienteFase}
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 px-6 py-2 rounded-xl text-sm font-bold transition"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>

      {/* Contenido por fase */}
      <div className="pb-20">
        {(!sala || sala.fase === undefined) && <PantallaInicio onIniciar={iniciarSala} />}
        {sala?.fase === "lobby" && <PantallaLobby participantes={participantes} />}
        {sala?.fase === "reflexion" && <ReflexionHost onActivar={activarReflexion} />}
        {sala?.fase === "instrumento" && <InstrumentoHost onAvanzar={avanzarSocializacion} />}
        {sala?.fase === "juego_ronda1" && <Ronda1Host />}
        {sala?.fase === "juego_ronda2" && <Ronda2Host />}
        {sala?.fase === "juego_ronda3" && <Ronda3Host />}
        {sala?.fase === "leaderboard" && <LeaderboardHost />}
        {sala?.fase === "evaluacion" && <EvaluacionHost />}
        {sala?.fase === "fin" && (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6">
            <div className="text-7xl">🎉</div>
            <h2 className="text-4xl font-bold text-yellow-400">¡Actividad finalizada!</h2>
            <p className="text-gray-400 text-xl">Gracias a todos por participar</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PantallaInicio({ onIniciar }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-10 py-12 gap-10">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-yellow-400 tracking-tight">
          {CONFIG.titulo}
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Actividad de Conjunto</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-2 gap-8">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold text-blue-400 mb-6">📋 Agenda</h2>
          <ol className="flex flex-col gap-4">
            {CONFIG.agenda.map((item, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="text-2xl">{item.icono}</span>
                <div className="w-full text-left">
                  <span className="text-gray-200 font-medium text-lg">{item.item}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold text-green-400 mb-6">🎯 Evidencias de Aprendizaje</h2>
          <ol className="flex flex-col gap-5">
            {CONFIG.evidencias.map((ev, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="bg-green-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-gray-300 leading-relaxed">{ev}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <button
        onClick={onIniciar}
        className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-xl px-12 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-yellow-400/30 hover:scale-105"
      >
        Iniciar actividad →
      </button>
    </div>
  )
}

function PantallaLobby({ participantes }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 px-10 py-12">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-yellow-400">¡Es hora de jugar!</h2>
        <p className="text-gray-400 mt-2 text-xl">
          Escanea el QR o ingresa al enlace para unirte
        </p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-2 gap-10 items-start">

        {/* QR */}
        <div className="flex flex-col items-center gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-yellow-400/20">
            <QRCode
              value={CONFIG.url_jugar}
              size={260}
              bgColor="#ffffff"
              fgColor="#111827"
              level="H"
            />
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl px-6 py-3 text-center">
            <p className="text-gray-400 text-sm mb-1">Ingresa desde tu celular a:</p>
            <p className="text-yellow-400 text-lg font-mono font-bold break-all">
              {CONFIG.url_jugar}
            </p>
          </div>
        </div>

        {/* Lista de participantes */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 min-h-64">
          <h3 className="text-xl font-bold text-white mb-4">
            👥 Participantes conectados ({participantes.length})
          </h3>
          {participantes.length === 0 ? (
            <p className="text-gray-500 italic">Esperando participantes...</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {participantes.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2"
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span className="text-white font-medium">{p.nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-gray-600 text-sm">
        Cuando todos estén conectados, presiona <strong className="text-gray-400">Siguiente →</strong> en la barra inferior.
      </p>
    </div>
  )
}

function PlaceholderFase({ titulo }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white">{titulo}</h2>
        <p className="text-gray-500 mt-3">Esta fase se implementará próximamente</p>
      </div>
    </div>
  )
}

function Cargando() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white text-xl animate-pulse">Conectando con Firebase...</p>
    </div>
  )
}
