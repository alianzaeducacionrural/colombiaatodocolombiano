export const CONFIG = {
  titulo: "Colombia a Todo Colombiano",
  bandera: "🇨🇴",

  agenda: [
    { icono: "🙏", item: "Reflexión — El espejo sin filtros" },
    { icono: "⚡", item: "Instrumento de Gobierno — El reto de hoy" },
    { icono: "🎮", item: "Colombia a Todo Colombiano" },
    { icono: "✅", item: "Evaluación" },
  ],

  evidencias: [
    "Reconozco aspectos relevantes de la cultura, geografía e historia de Colombia como parte de mi identidad territorial.",
    "Participo activa y respetuosamente en dinámicas grupales en entornos híbridos (presencial y virtual).",
    "Demuestro capacidad para trabajar bajo presión, tomar decisiones rápidas y colaborar con otros en tiempo real.",
  ],

  reflexion: {
    nombre: "El espejo sin filtros 🪞",
    videoId: "g7utFwWvez8",
    instruccion: "Describe en una palabra… ¿qué te dejó el video?",
    videoStart: 0,
    videoEnd: 163,
  },

  rondas: [
    {
      id: "ronda1",
      nombre: "¿Quién soy? 🕵️",
      descripcion: "Adivina el colombiano famoso con las pistas",
      tipo: "pistas",
      tiempo: 20,
      puntosPorVelocidad: true,
      puntosMax: 1000,
      preguntas: [
        {
          personaje: "Shakira",
          pistas: [
            "Nací en Barranquilla en 1977",
            "Soy cantante y compositora",
            "Mis caderas no mienten 🎵",
          ],
          opciones: ["Karol G", "Shakira", "Maluma", "J Balvin"],
          correcta: 1,
        },
        {
          personaje: "García Márquez",
          pistas: [
            "Nací en Aracataca, Magdalena",
            "Escribí novelas y cuentos",
            "Gané el Nobel de Literatura en 1982 📚",
          ],
          opciones: ["Tomás González", "Álvaro Mutis", "García Márquez", "Marvel Moreno"],
          correcta: 2,
        },
        {
          personaje: "Falcao",
          pistas: [
            "Nací en Santa Marta en 1986",
            "Soy futbolista profesional",
            'Me llaman "El Tigre" ⚽',
          ],
          opciones: ["James Rodríguez", "Valderrama", "Higuita", "Falcao"],
          correcta: 3,
        },
        {
          personaje: "Karol G",
          pistas: [
            "Nací en Medellín en 1991",
            "Soy cantante de reggaeton",
            'Me llaman "La Bichota" 🎤',
          ],
          opciones: ["Maluma", "Shakira", "Karol G", "Fanny Lu"],
          correcta: 2,
        },
        {
          personaje: "Fernando Botero",
          pistas: [
            "Nací en Medellín en 1932",
            "Soy pintor y escultor",
            "Mis figuras son voluminosas y redondas 🎨",
          ],
          opciones: ["Alejandro Obregón", "Fernando Botero", "Débora Arango", "Edgar Negret"],
          correcta: 1,
        },
      ],
    },
    {
      id: "ronda2",
      nombre: "Zoom Colombia 📸",
      descripcion: "Adivina el lugar antes de que se revele la imagen",
      tipo: "zoom",
      puntosPorNivel: [1000, 600, 300],
      tiempoPorNivel: 5,
      tiempoTotal: 15,
      preguntas: [
        {
          imagen: "/colombiaatodocolombiano/imagenes/cano-cristales.jpg",
          opciones: ["Río Amazonas", "Caño Cristales", "Río Claro", "Laguna de la Cocha"],
          correcta: 1,
        },
        {
          imagen: "/colombiaatodocolombiano/imagenes/sombrero-vueltiao.jpg",
          opciones: ["Sombrero aguadeño", "Sombrero sabanero", "Sombrero vueltiao", "Sombrero antioqueño"],
          correcta: 2,
        },
        {
          imagen: "/colombiaatodocolombiano/imagenes/catedral-sal.jpg",
          opciones: ["Catedral Primada", "Basílica del Señor", "Iglesia de San Pedro", "Catedral de Sal"],
          correcta: 3,
        },
        {
          imagen: "/colombiaatodocolombiano/imagenes/penol-guatape.jpg",
          opciones: ["Cerro Nutibara", "Piedra del Cocuy", "Cerro de Monserrate", "El Peñol de Guatapé"],
          correcta: 3,
        },
      ],
    },
    {
      id: "ronda3",
      nombre: "Frente a Frente ⚡",
      descripcion: "Un representante por grupo responde simultáneamente",
      tipo: "grupos",
      tiempo: 20,
      numGrupos: 3,
      puntosMax: 800,
      preguntas: [
        {
          texto: "¿En qué océanos tiene costa Colombia?",
          opciones: ["Solo Pacífico", "Solo Atlántico", "Pacífico y Atlántico", "Ninguno"],
          correcta: 2,
        },
        {
          texto: "¿En qué ciudad nació Shakira?",
          opciones: ["Bogotá", "Medellín", "Cali", "Barranquilla"],
          correcta: 3,
        },
        {
          texto: "¿A cuántos msnm está Manizales?",
          opciones: ["1.200", "1.800", "2.153", "3.200"],
          correcta: 2,
        },
        {
          texto: "¿Cuál es la flor nacional de Colombia?",
          opciones: ["Rosa", "Orquídea", "Girasol", "Lirio"],
          correcta: 1,
        },
        {
          texto: "¿El Carnaval de Barranquilla es Patrimonio de la Humanidad?",
          opciones: ["Sí", "No", "Solo de Colombia", "En trámite"],
          correcta: 0,
        },
      ],
    },
  ],

  url_jugar: "https://alianzaeducacionrural.github.io/colombiaatodocolombiano/jugar",
}
