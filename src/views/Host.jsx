import { useState } from "react"
import { CONFIG } from "../data/actividad.config"
import { QRCodeSVG as QRCode } from "qrcode.react"

export default function Host() {
  const [fase, setFase] = useState("agenda")

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {fase === "agenda" && <PantallaAgenda onNext={() => setFase("qr")} />}
      {fase === "qr" && <PantallaQR />}
    </div>
  )
}

function PantallaAgenda({ onNext }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-10 py-12 gap-10">

      {/* Título */}
      <div className="text-center">
        <h1 className="text-5xl font-bold text-yellow-400 tracking-tight">
          {CONFIG.titulo}
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Actividad de Conjunto</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-2 gap-8">

        {/* Agenda */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold text-blue-400 mb-6">📋 Agenda</h2>
          <ol className="flex flex-col gap-4">
            {CONFIG.agenda.map((item, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="text-2xl">{item.icono}</span>
                <div className="w-full text-left">
                  <span className="text-gray-200 font-medium text-lg">
                    {item.item}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Evidencias */}
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

      {/* Botón siguiente */}
      <button
        onClick={onNext}
        className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-xl px-12 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-yellow-400/30 hover:scale-105"
      >
        Iniciar actividad →
      </button>
    </div>
  )
}

function PantallaQR() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10">

      <div className="text-center">
        <h2 className="text-4xl font-bold text-yellow-400">¡Es hora de jugar!</h2>
        <p className="text-gray-400 mt-2 text-xl">Escanea el QR o ingresa al enlace para unirte</p>
      </div>

      {/* QR */}
      <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-yellow-400/20">
        <QRCode
          value={CONFIG.url_jugar}
          size={280}
          bgColor="#ffffff"
          fgColor="#111827"
          level="H"
        />
      </div>

      {/* URL */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl px-8 py-4">
        <p className="text-gray-400 text-sm text-center mb-1">Ingresa desde tu celular a:</p>
        <p className="text-yellow-400 text-2xl font-mono font-bold text-center">
          {CONFIG.url_jugar}
        </p>
      </div>

      <p className="text-gray-600 text-sm">
        Cuando todos estén conectados, continúa desde el panel del anfitrión.
      </p>
    </div>
  )
}
