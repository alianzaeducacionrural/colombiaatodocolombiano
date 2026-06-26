import { useState, useEffect } from "react"

const PREFASES = {
  reflexion: {
    icono: "🙏",
    nombre: "Reflexión",
    subtitulo: "El espejo sin filtros",
    instrucciones: [
      "Observa el video con atención",
      "Reflexiona en silencio sobre el mensaje",
      "Al finalizar, escribe en tu celular una palabra que te dejó",
    ],
    color: "text-purple-400",
    border: "border-purple-400/30",
    bg: "bg-purple-400/10",
  },
  instrumento: {
    icono: "⚡",
    nombre: "Instrumento de Gobierno",
    subtitulo: "El reto de hoy",
    instrucciones: [
      "Piensa en un reto laboral que quieres asumir hoy",
      "Escríbelo en tu celular con honestidad",
      "Algunos compañeros compartirán su reto en voz alta",
    ],
    color: "text-orange-400",
    border: "border-orange-400/30",
    bg: "bg-orange-400/10",
  },
  juego_ronda1: {
    icono: "🕵️",
    nombre: "Ronda 1",
    subtitulo: "¿Quién soy?",
    instrucciones: [
      "Se revelarán 3 pistas una por una sobre un colombiano famoso",
      "Las opciones de respuesta aparecen desde el inicio",
      "Responde en tu celular — ¡más rápido, más puntos!",
    ],
    color: "text-blue-400",
    border: "border-blue-400/30",
    bg: "bg-blue-400/10",
  },
  juego_ronda2: {
    icono: "📸",
    nombre: "Ronda 2",
    subtitulo: "Zoom Colombia",
    instrucciones: [
      "Se mostrará una imagen borrosa de un lugar colombiano",
      "La imagen se irá aclarando cada 5 segundos",
      "Adivina antes — ¡entre más borrosa, más puntos!",
    ],
    color: "text-green-400",
    border: "border-green-400/30",
    bg: "bg-green-400/10",
  },
  juego_ronda3: {
    icono: "⚡",
    nombre: "Ronda 3",
    subtitulo: "Frente a Frente",
    instrucciones: [
      "El equipo se divide en 3 grupos",
      "Un representante por grupo responde cada pregunta",
      "Los puntos se comparten con todo el grupo — ¡anima a tu representante!",
    ],
    color: "text-red-400",
    border: "border-red-400/30",
    bg: "bg-red-400/10",
  },
  leaderboard_parcial_1: {
    icono: "🏆",
    nombre: "Resultados Ronda 1",
    subtitulo: "¿Cómo vamos?",
    instrucciones: [
      "Revisa tu posición en la tabla",
      "Aún quedan 2 rondas — ¡todo puede cambiar!",
    ],
    color: "text-yellow-400",
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/10",
  },
  leaderboard_parcial_2: {
    icono: "🏆",
    nombre: "Resultados Ronda 2",
    subtitulo: "¿Cómo vamos?",
    instrucciones: [
      "Revisa tu posición actualizada",
      "La Ronda 3 es grupal — los puntos se reparten entre el equipo",
    ],
    color: "text-yellow-400",
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/10",
  },
  evaluacion: {
    icono: "🎲",
    nombre: "Evaluación",
    subtitulo: "El micrófono viajero",
    instrucciones: [
      "Se girará una ruleta para seleccionar quién responde",
      "3 preguntas de reflexión sobre la actividad",
      "El seleccionado responde en voz alta",
    ],
    color: "text-pink-400",
    border: "border-pink-400/30",
    bg: "bg-pink-400/10",
  },
}

// Vista del ANFITRIÓN — cuenta regresiva 5 segundos y avanza automáticamente
export function PreFaseHost({ fase, onListo }) {
  const [cuenta, setCuenta] = useState(5)
  const info = PREFASES[fase]

  useEffect(() => {
    setCuenta(5)
    const intervalo = setInterval(() => {
      setCuenta(c => {
        if (c <= 1) {
          clearInterval(intervalo)
          onListo()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(intervalo)
  }, [fase])

  if (!info) return null

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 px-10">
      <div className="text-center">
        <span className="text-7xl">{info.icono}</span>
        <p className={`text-sm uppercase tracking-widest mt-4 ${info.color}`}>
          A continuación
        </p>
        <h2 className="text-5xl font-black text-white mt-2">{info.nombre}</h2>
        <p className={`text-2xl font-medium mt-1 ${info.color}`}>{info.subtitulo}</p>
      </div>

      <div className={`w-full max-w-lg rounded-2xl border ${info.border} ${info.bg} p-6`}>
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">
          Instrucciones
        </p>
        <ol className="flex flex-col gap-3">
          {info.instrucciones.map((inst, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`font-black text-lg w-6 shrink-0 ${info.color}`}>
                {i + 1}.
              </span>
              <p className="text-white text-lg leading-snug">{inst}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Cuenta regresiva */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-gray-500 text-sm">Comenzando en</p>
        <span className={`text-7xl font-black ${info.color}`}>{cuenta}</span>
      </div>
    </div>
  )
}

// Vista del PARTICIPANTE — misma info, sin cuenta regresiva
export function PreFasePlayer({ fase }) {
  const info = PREFASES[fase]
  if (!info) return null

  return (
    <div className="h-full bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-6xl">{info.icono}</span>
      <div>
        <p className={`text-sm uppercase tracking-widest ${info.color}`}>
          A continuación
        </p>
        <h2 className="text-3xl font-black text-white mt-1">{info.nombre}</h2>
        <p className={`text-lg ${info.color} mt-1`}>{info.subtitulo}</p>
      </div>

      <div className={`w-full max-w-sm rounded-2xl border ${info.border} ${info.bg} p-5`}>
        <ol className="flex flex-col gap-3 text-left">
          {info.instrucciones.map((inst, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`font-black w-5 shrink-0 ${info.color}`}>{i + 1}.</span>
              <p className="text-gray-300 text-sm leading-snug">{inst}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-1">
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
              style={{animationDelay:"0ms"}}></span>
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
              style={{animationDelay:"150ms"}}></span>
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
              style={{animationDelay:"300ms"}}></span>
      </div>
    </div>
  )
}
