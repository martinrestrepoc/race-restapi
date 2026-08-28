// ---------------------------------------------------------------------------
// Shared mock data for the EIA Camel vs. Dwarf Racing System design exploration.
// Purely illustrative — no backend, no persistence, no real endpoints.
// ---------------------------------------------------------------------------

export type Role = "Administrator" | "Race Organizer" | "Viewer"

export type CompetitorType = "DWARF" | "CAMEL" | "MEDIUM" | "OTHER"
export type CompetitorStatus = "ACTIVE" | "INJURED" | "SUSPENDED" | "RETIRED"
export type RaceType = "INDIVIDUAL" | "TEAM" | "MIXED"
export type RaceStatus =
  | "DRAFT"
  | "OPEN_FOR_REGISTRATION"
  | "CLOSED_FOR_REGISTRATION"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
export type ResultStatus = "FINISHED" | "DISQUALIFIED" | "DID_NOT_FINISH" | "DID_NOT_START"

export interface Competitor {
  id: string
  name: string
  nickname: string
  type: CompetitorType
  age: number
  weightKg: number
  heightCm: number
  origin: string
  status: CompetitorStatus
  team?: string
  wins: number
  losses: number
  races: number
}

export interface Team {
  id: string
  name: string
  description: string
  coach: string
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE"
  memberIds: string[]
  wins: number
  losses: number
}

export interface Race {
  id: string
  name: string
  description: string
  date: string // ISO
  startLocation: string
  finishLocation: string
  distanceM: number
  maxParticipants: number
  registered: number
  type: RaceType
  status: RaceStatus
  organizer: string
  registrationDeadline: string
}

export interface Registration {
  id: string
  competitorId?: string
  teamId?: string
  status: RegistrationStatus
  lane: number
  registeredBy: string
  note?: string
}

export interface RaceResult {
  competitorId: string
  startPosition: number
  finalPosition: number | null
  timeSeconds: number | null
  penaltySeconds: number
  status: ResultStatus
}

export const POINTS: Record<string, number> = {
  "1": 10,
  "2": 7,
  "3": 5,
  "4": 3,
  "5": 1,
}

export const competitors: Competitor[] = [
  {
    id: "c1",
    name: "Byte",
    nickname: "The Humpbacked Server",
    type: "CAMEL",
    age: 9,
    weightKg: 612,
    heightCm: 213,
    origin: "Desierto de La Guajira",
    status: "ACTIVE",
    wins: 14,
    losses: 3,
    races: 17,
  },
  {
    id: "c2",
    name: "Null Pointer",
    nickname: "Segfault",
    type: "DWARF",
    age: 34,
    weightKg: 58,
    heightCm: 132,
    origin: "Envigado",
    status: "ACTIVE",
    team: "The Five Exceptions",
    wins: 9,
    losses: 6,
    races: 15,
  },
  {
    id: "c3",
    name: "Stack Overflow",
    nickname: "Copy-Paste",
    type: "DWARF",
    age: 29,
    weightKg: 61,
    heightCm: 128,
    origin: "Sabaneta",
    status: "ACTIVE",
    team: "The Five Exceptions",
    wins: 11,
    losses: 4,
    races: 15,
  },
  {
    id: "c4",
    name: "Little Lambda",
    nickname: "Anonymous",
    type: "DWARF",
    age: 26,
    weightKg: 55,
    heightCm: 124,
    origin: "Alto de Las Palmas",
    status: "INJURED",
    team: "The Five Exceptions",
    wins: 7,
    losses: 8,
    races: 15,
  },
  {
    id: "c5",
    name: "Captain Cache",
    nickname: "TTL",
    type: "DWARF",
    age: 41,
    weightKg: 64,
    heightCm: 136,
    origin: "Rionegro",
    status: "ACTIVE",
    team: "The Five Exceptions",
    wins: 12,
    losses: 3,
    races: 15,
  },
  {
    id: "c6",
    name: "Tiny Docker",
    nickname: "Container",
    type: "DWARF",
    age: 31,
    weightKg: 59,
    heightCm: 130,
    origin: "Zúñiga",
    status: "SUSPENDED",
    team: "The Five Exceptions",
    wins: 6,
    losses: 9,
    races: 15,
  },
  {
    id: "c7",
    name: "Kernel Panic",
    nickname: "Blue Screen",
    type: "CAMEL",
    age: 7,
    weightKg: 588,
    heightCm: 205,
    origin: "Neiva",
    status: "ACTIVE",
    wins: 8,
    losses: 5,
    races: 13,
  },
  {
    id: "c8",
    name: "Merge Conflict",
    nickname: "HEAD~1",
    type: "MEDIUM",
    age: 22,
    weightKg: 180,
    heightCm: 165,
    origin: "Medellín",
    status: "RETIRED",
    wins: 4,
    losses: 12,
    races: 16,
  },
]

export const teams: Team[] = [
  {
    id: "t1",
    name: "The Five Exceptions",
    description:
      "El escuadrón legendario de cinco enanos que nunca lanzan el mismo error dos veces.",
    coach: "Mr. Abandonado",
    status: "ACTIVE",
    memberIds: ["c2", "c3", "c4", "c5", "c6"],
    wins: 22,
    losses: 11,
  },
  {
    id: "t2",
    name: "The Garbage Collectors",
    description: "Recogen todo lo que los demás dejan atrás en la pista.",
    coach: "Doña Heap",
    status: "ACTIVE",
    memberIds: ["c7"],
    wins: 5,
    losses: 8,
  },
  {
    id: "t3",
    name: "Deprecated United",
    description: "Un club histórico marcado para eliminación en la próxima versión.",
    coach: "El Legacy",
    status: "SUSPENDED",
    memberIds: ["c8"],
    wins: 3,
    losses: 15,
  },
]

export const races: Race[] = [
  {
    id: "r1",
    name: "Gran Clásico del Kilómetro",
    description:
      "Carrera mixta de un kilómetro sobre el terreno original de Alto de Las Palmas.",
    date: "2026-08-15T14:00:00",
    startLocation: "Zúñiga, Envigado",
    finishLocation: "Alto de Las Palmas",
    distanceM: 1000,
    maxParticipants: 8,
    registered: 6,
    type: "MIXED",
    status: "OPEN_FOR_REGISTRATION",
    organizer: "Race Organizer",
    registrationDeadline: "2026-08-14T18:00:00",
  },
  {
    id: "r2",
    name: "Duelo de Excepciones",
    description: "Enfrentamiento por equipos entre los cinco enanos más veloces.",
    date: "2026-08-09T16:30:00",
    startLocation: "Campus Zúñiga",
    finishLocation: "Campus Zúñiga",
    distanceM: 800,
    maxParticipants: 10,
    registered: 10,
    type: "TEAM",
    status: "IN_PROGRESS",
    organizer: "Race Organizer",
    registrationDeadline: "2026-08-08T20:00:00",
  },
  {
    id: "r3",
    name: "Copa Camello Solitario",
    description: "Prueba individual de resistencia. Byte defiende su título.",
    date: "2026-07-28T09:00:00",
    startLocation: "Las Palmas",
    finishLocation: "Las Palmas",
    distanceM: 1500,
    maxParticipants: 6,
    registered: 6,
    type: "INDIVIDUAL",
    status: "COMPLETED",
    organizer: "Administrator",
    registrationDeadline: "2026-07-27T12:00:00",
  },
  {
    id: "r4",
    name: "Sprint de Contenedores",
    description: "Carrera relámpago aún en preparación.",
    date: "2026-08-22T10:00:00",
    startLocation: "Sabaneta",
    finishLocation: "Envigado",
    distanceM: 500,
    maxParticipants: 12,
    registered: 0,
    type: "MIXED",
    status: "DRAFT",
    organizer: "Race Organizer",
    registrationDeadline: "2026-08-21T12:00:00",
  },
  {
    id: "r5",
    name: "Maratón del Legacy",
    description: "Suspendida tras un conflicto de fusión en la pista.",
    date: "2026-08-05T11:00:00",
    startLocation: "Rionegro",
    finishLocation: "Rionegro",
    distanceM: 2000,
    maxParticipants: 8,
    registered: 4,
    type: "INDIVIDUAL",
    status: "CANCELLED",
    organizer: "Administrator",
    registrationDeadline: "2026-08-04T12:00:00",
  },
  {
    id: "r6",
    name: "Clasificatorio de Otoño",
    description: "Inscripciones cerradas, a la espera del banderazo inicial.",
    date: "2026-08-11T15:00:00",
    startLocation: "Envigado",
    finishLocation: "Las Palmas",
    distanceM: 1000,
    maxParticipants: 8,
    registered: 8,
    type: "MIXED",
    status: "CLOSED_FOR_REGISTRATION",
    organizer: "Race Organizer",
    registrationDeadline: "2026-08-10T18:00:00",
  },
]

export const registrations: Registration[] = [
  { id: "rg1", competitorId: "c1", status: "APPROVED", lane: 1, registeredBy: "admin" },
  { id: "rg2", teamId: "t1", status: "APPROVED", lane: 2, registeredBy: "organizer" },
  {
    id: "rg3",
    competitorId: "c7",
    status: "PENDING",
    lane: 3,
    registeredBy: "organizer",
    note: "Verificación de peso pendiente.",
  },
  {
    id: "rg4",
    competitorId: "c8",
    status: "REJECTED",
    lane: 4,
    registeredBy: "organizer",
    note: "Competidor RETIRED: no elegible para nuevas carreras.",
  },
]

// Results for the completed race r3.
export const raceResults: RaceResult[] = [
  { competitorId: "c1", startPosition: 3, finalPosition: 1, timeSeconds: 214, penaltySeconds: 0, status: "FINISHED" },
  { competitorId: "c5", startPosition: 1, finalPosition: 2, timeSeconds: 221, penaltySeconds: 0, status: "FINISHED" },
  { competitorId: "c3", startPosition: 2, finalPosition: 3, timeSeconds: 229, penaltySeconds: 4, status: "FINISHED" },
  { competitorId: "c7", startPosition: 4, finalPosition: 4, timeSeconds: 236, penaltySeconds: 0, status: "FINISHED" },
  { competitorId: "c2", startPosition: 5, finalPosition: null, timeSeconds: null, penaltySeconds: 0, status: "DID_NOT_FINISH" },
  { competitorId: "c6", startPosition: 6, finalPosition: null, timeSeconds: null, penaltySeconds: 0, status: "DISQUALIFIED" },
]

export interface StandingRow {
  id: string
  name: string
  detail: string
  points: number
  wins: number
  races: number
}

export const competitorStandings: StandingRow[] = [
  { id: "c1", name: "Byte", detail: "CAMEL · La Guajira", points: 87, wins: 14, races: 17 },
  { id: "c5", name: "Captain Cache", detail: "DWARF · The Five Exceptions", points: 74, wins: 12, races: 15 },
  { id: "c3", name: "Stack Overflow", detail: "DWARF · The Five Exceptions", points: 68, wins: 11, races: 15 },
  { id: "c2", name: "Null Pointer", detail: "DWARF · The Five Exceptions", points: 51, wins: 9, races: 15 },
  { id: "c7", name: "Kernel Panic", detail: "CAMEL · Neiva", points: 47, wins: 8, races: 13 },
  { id: "c4", name: "Little Lambda", detail: "DWARF · The Five Exceptions", points: 33, wins: 7, races: 15 },
]

export const teamStandings: StandingRow[] = [
  { id: "t1", name: "The Five Exceptions", detail: "Coach: Mr. Abandonado", points: 196, wins: 22, races: 33 },
  { id: "t2", name: "The Garbage Collectors", detail: "Coach: Doña Heap", points: 61, wins: 5, races: 13 },
  { id: "t3", name: "Deprecated United", detail: "Coach: El Legacy · SUSPENDED", points: 24, wins: 3, races: 18 },
]

export interface RecentResult {
  raceId: string
  raceName: string
  winner: string
  winnerType: CompetitorType
  runnerUp: string
  date: string
  distanceM: number
}

export const recentResults: RecentResult[] = [
  {
    raceId: "r3",
    raceName: "Copa Camello Solitario",
    winner: "Byte",
    winnerType: "CAMEL",
    runnerUp: "Captain Cache",
    date: "2026-07-28T09:00:00",
    distanceM: 1500,
  },
  {
    raceId: "r0",
    raceName: "Invitacional de Primavera",
    winner: "Captain Cache",
    winnerType: "DWARF",
    runnerUp: "Stack Overflow",
    date: "2026-07-14T10:00:00",
    distanceM: 1000,
  },
  {
    raceId: "r00",
    raceName: "Desafío del Container",
    winner: "Stack Overflow",
    winnerType: "DWARF",
    runnerUp: "Byte",
    date: "2026-06-30T15:00:00",
    distanceM: 500,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function competitorById(id: string) {
  return competitors.find((c) => c.id === id)
}

export function raceStatusLabel(status: RaceStatus): string {
  const map: Record<RaceStatus, string> = {
    DRAFT: "Borrador",
    OPEN_FOR_REGISTRATION: "Inscripciones abiertas",
    CLOSED_FOR_REGISTRATION: "Inscripciones cerradas",
    IN_PROGRESS: "En curso",
    COMPLETED: "Finalizada",
    CANCELLED: "Cancelada",
  }
  return map[status]
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(seconds: number | null): string {
  if (seconds === null) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export const roles: { role: Role; blurb: string }[] = [
  { role: "Administrator", blurb: "Control total: usuarios, competidores, carreras y auditoría." },
  { role: "Race Organizer", blurb: "Gestiona carreras, inscripciones y resultados." },
  { role: "Viewer", blurb: "Solo lectura de calendario, resultados y clasificaciones." },
]

export interface DirectionMeta {
  slug: string
  index: string
  title: string
  tagline: string
  idea: string
  personality: string
  palette: string[]
  fonts: string
  navigation: string
  distinctive: string
  strengths: string
  risks: string
  bestFor: string
  swatchClass: string
}

export const directions: DirectionMeta[] = [
  {
    slug: "premium",
    index: "01",
    title: "Liga Deportiva Premium",
    tagline: "Estudio de transmisión deportiva",
    idea: "Una plataforma seria y basada en datos, como una liga profesional con producción de televisión.",
    personality: "Segura, dinámica, cinematográfica. La información se siente en vivo.",
    palette: ["Casi negro azulado", "Lima eléctrica (señal)", "Grises fríos", "Ámbar de alerta"],
    fonts: "Oswald condensada para titulares + Inter para datos.",
    navigation: "Barra lateral compacta con iconos y una barra superior tipo marcador.",
    distinctive: "Marcadores en vivo, dorsales tipográficos, franjas diagonales de velocidad.",
    strengths: "Impacto inmediato, jerarquía clara de datos, ideal para demostrar resultados y clasificaciones.",
    risks: "El tema oscuro exige buen contraste; abusar del color señal cansa la vista.",
    bestFor: "Demostración ante jurado buscando un producto pulido y comercial.",
    swatchClass: "theme-premium",
  },
  {
    slug: "archive",
    index: "02",
    title: "Archivo Histórico Excéntrico",
    tagline: "Carteles antiguos y periódico universitario",
    idea: "Un club deportivo tradicional documentado en un archivo de universidad, con tinta sobre papel.",
    personality: "Nostálgica, letrada, con humor seco. Cada pantalla parece una página de gaceta.",
    palette: ["Papel envejecido", "Tinta sepia", "Oxblood", "Verde bosque"],
    fonts: "Playfair Display para títulos + Spectral para lectura.",
    navigation: "Cabecera tipo mástil de periódico con secciones y filetes finos.",
    distinctive: "Filetes, sellos, numeración de columnas, tipografía de titular editorial.",
    strengths: "Personalidad memorable, altísima legibilidad, encaja con la narrativa absurda.",
    risks: "El estilo editorial puede reñir con densidad de datos si se abusa de filetes.",
    bestFor: "Quien valora identidad narrativa y una experiencia con carácter propio.",
    swatchClass: "theme-archive",
  },
  {
    slug: "control",
    index: "03",
    title: "Centro de Control de Carrera",
    tagline: "Telemetría y monitoreo en vivo",
    idea: "Un panel operativo de boxes: estados, alertas, tiempos y acciones del organizador en primer plano.",
    personality: "Técnica, precisa, monoespaciada. Todo es estado y señal.",
    palette: ["Pizarra profunda", "Cian de datos", "Ámbar de alerta", "Verde OK"],
    fonts: "JetBrains Mono en toda la interfaz para sensación de instrumento.",
    navigation: "Rieles laterales con módulos y una barra de estado del sistema siempre visible.",
    distinctive: "Indicadores tipo LED, cronómetros, tablas densas, líneas de cuadrícula técnica.",
    strengths: "Perfecta para gestionar carreras en vivo, inscripciones y resultados con precisión.",
    risks: "La estética mono puede parecer fría o intimidar a usuarios Viewer casuales.",
    bestFor: "Rol Race Organizer operando una jornada de carreras en tiempo real.",
    swatchClass: "theme-control",
  },
  {
    slug: "experimental",
    index: "04",
    title: "Universidad Experimental",
    tagline: "Editorial contemporánea con humor",
    idea: "Una facultad de ingeniería que organiza una competencia absurda y lo asume con orgullo de diseño.",
    personality: "Expresiva, asimétrica, con guiños. Profesional pero con sentido del humor.",
    palette: ["Blanco hueso", "Cobalto", "Coral intenso", "Tinta"],
    fonts: "Space Grotesk expresiva + Instrument Serif en cursiva para acentos.",
    navigation: "Navegación superior generosa con composiciones editoriales asimétricas.",
    distinctive: "Bloques grandes, cursivas expresivas, notas al margen, ilustración sutil.",
    strengths: "Diferenciación total, memorable, transmite la personalidad del proyecto EIA.",
    risks: "La asimetría debe manejarse con cuidado para no romper la usabilidad de tablas.",
    bestFor: "Presentación que quiere destacar creatividad sin perder profesionalismo.",
    swatchClass: "theme-experimental",
  },
]
