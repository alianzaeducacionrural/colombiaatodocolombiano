import { useEffect, useState } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update, push } from "firebase/database"

export function useParticipante() {
  const [userId, setUserId] = useState(null)
  const [nombre, setNombre] = useState("")
  const [faseActual, setFaseActual] = useState("lobby")
  const [registrado, setRegistrado] = useState(false)

  // Escucha la fase actual de la sala
  useEffect(() => {
    const faseRef = ref(db, "sala/fase")
    const unsub = onValue(faseRef, (snapshot) => {
      if (snapshot.val()) setFaseActual(snapshot.val())
    })
    return () => unsub()
  }, [])

  // Registra al participante con su nombre
  async function registrarme(nombreIngresado) {
    const nuevoRef = push(ref(db, "sala/participantes"))
    const id = nuevoRef.key
    await update(ref(db, `sala/participantes/${id}`), {
      nombre: nombreIngresado,
      conectado: true,
      puntaje: 0
    })
    setUserId(id)
    setNombre(nombreIngresado)
    setRegistrado(true)
    return id
  }

  // Envía una respuesta para la fase actual
  async function enviarRespuesta(fase, respuesta) {
    if (!userId) return
    await update(ref(db, `sala/respuestas/${fase}/${userId}`), {
      respuesta,
      nombre,
      timestamp: Date.now()
    })
  }

  return { userId, nombre, faseActual, registrado, registrarme, enviarRespuesta }
}
