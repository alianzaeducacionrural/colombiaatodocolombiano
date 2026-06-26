import { useEffect, useState } from "react"
import { db } from "../config/firebase"
import { ref, onValue, update, push, get } from "firebase/database"

export function useParticipante() {
  const [userId, setUserId] = useState(
    () => sessionStorage.getItem("userId") || null
  )
  const [nombre, setNombre] = useState(
    () => sessionStorage.getItem("nombre") || ""
  )
  const [faseActual, setFaseActual] = useState("lobby")
  const [registrado, setRegistrado] = useState(
    () => !!sessionStorage.getItem("userId")
  )

  // Si hay sesión guardada, verifica que el userId aún exista en Firebase
  // (si la sala fue reiniciada, el participante ya no existe → limpiar sesión)
  useEffect(() => {
    if (!userId) return
    get(ref(db, `sala/participantes/${userId}`)).then(snap => {
      if (!snap.exists()) {
        sessionStorage.removeItem("userId")
        sessionStorage.removeItem("nombre")
        setUserId(null)
        setNombre("")
        setRegistrado(false)
      }
    })
  }, [])

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
      puntaje: 0
    })
    setUserId(id)
    setNombre(nombreIngresado)
    setRegistrado(true)
    sessionStorage.setItem("userId", id)
    sessionStorage.setItem("nombre", nombreIngresado)
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
