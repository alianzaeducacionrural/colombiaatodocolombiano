// Así se ve la sala en Firebase cuando se inicializa
export const SALA_INICIAL = {
  fase: "lobby",         // fase actual controlada por el anfitrión
  participantes: {},     // { userId: { nombre, conectado } }
  respuestas: {}         // { fase: { userId: respuesta } }
}

// Orden de las fases
export const FASES = [
  "lobby",
  "reflexion",
  "instrumento",
  "juego_ronda1",
  "leaderboard_parcial_1",
  "juego_ronda2",
  "leaderboard_parcial_2",
  "juego_ronda3",
  "leaderboard",
  "evaluacion",
  "fin"
]
