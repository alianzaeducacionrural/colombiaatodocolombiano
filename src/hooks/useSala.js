import { useEffect, useState } from "react"
import { db } from "../config/firebase"
import { ref, onValue, set, update } from "firebase/database"
import { SALA_INICIAL, FASES } from "../config/salaInicial"

export function useSala() {
  const [sala, setSala] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const salaRef = ref(db, "sala")
    const unsub = onValue(salaRef, (snapshot) => {
      setSala(snapshot.val())
      setCargando(false)
    })
    return () => unsub()
  }, [])

  // Inicializa la sala (solo el anfitrión)
  async function iniciarSala() {
    await set(ref(db, "sala"), SALA_INICIAL)
  }

  // Avanza a la siguiente fase (solo el anfitrión)
  async function siguienteFase() {
    if (!sala) return
    const idx = FASES.indexOf(sala.fase)
    const siguiente = FASES[idx + 1]
    if (siguiente) {
      await update(ref(db, "sala"), { fase: siguiente })
    }
  }

  // Retrocede (por si hay errores)
  async function faseAnterior() {
    if (!sala) return
    const idx = FASES.indexOf(sala.fase)
    const anterior = FASES[idx - 1]
    if (anterior) {
      await update(ref(db, "sala"), { fase: anterior })
    }
  }

  return { sala, cargando, iniciarSala, siguienteFase, faseAnterior }
}
