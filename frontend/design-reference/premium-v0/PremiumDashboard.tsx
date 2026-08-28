import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  ArrowLeft,
  Bell,
  ChevronRight,
  Flag,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Medal,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Trophy,
  Users,
  X,
} from "lucide-react"
import {
  competitors,
  formatDate,
  formatTime,
  races,
  raceResults,
  recentResults,
  competitorById,
  competitorStandings,
  raceStatusLabel,
  type RaceStatus,
  type Role,
} from "./data"

const NAV = [
  { icon: LayoutDashboard, label: "Panel" },
  { icon: Flag, label: "Carreras" },
  { icon: Users, label: "Competidores" },
  { icon: ListChecks, label: "Inscripciones" },
  { icon: Medal, label: "Clasificación" },
]

function statusChip(status: RaceStatus) {
  const map: Record<RaceStatus, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    OPEN_FOR_REGISTRATION: "bg-success/15 text-success",
    CLOSED_FOR_REGISTRATION: "bg-warning/15 text-warning",
    IN_PROGRESS: "bg-primary/20 text-primary",
    COMPLETED: "bg-info/15 text-info",
    CANCELLED: "bg-destructive/15 text-destructive",
  }
  return map[status]
}

export function PremiumDashboard() {
  const [role, setRole] = useState<Role>("Administrator")
  const [demoState, setDemoState] = useState<"data" | "loading" | "empty" | "error">("data")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canManage = role !== "Viewer"
  const liveRace = races.find((r) => r.status === "IN_PROGRESS")!
  const upcoming = races.filter((r) =>
    ["OPEN_FOR_REGISTRATION", "CLOSED_FOR_REGISTRATION", "DRAFT"].includes(r.status),
  )
  const activeCompetitors = competitors.filter((c) => c.status === "ACTIVE")

  return (
    <div className="theme-premium min-h-screen bg-background font-sans text-foreground">
      <div className="flex">
        {/* Icon rail */}
        <aside className="sticky top-0 hidden h-screen w-16 flex-col items-center gap-1 border-r border-border bg-card py-4 md:flex">
          <div className="mb-4 flex size-9 items-center justify-center rounded bg-primary text-primary-foreground">
            <Trophy className="size-5" aria-hidden />
          </div>
          {NAV.map((item, i) => (
            <button
              key={item.label}
              className={`flex size-11 flex-col items-center justify-center rounded-md text-[10px] transition-colors ${
                i === 0
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
              title={item.label}
            >
              <item.icon className="size-5" aria-hidden />
            </button>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Scoreboard top bar */}
          <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:px-6">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">Direcciones</span>
            </Link>
            <div className="hidden items-center gap-2 lg:flex">
              <span
                className="text-sm font-bold uppercase tracking-widest"
                style={{ fontFamily: "var(--font-display)" }}
              >
                EIA Racing League
              </span>
              <span className="flex items-center gap-1.5 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                EN VIVO
              </span>
            </div>

            <div className="relative ml-auto hidden max-w-xs flex-1 items-center md:flex">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
              <input
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="Buscar competidor, carrera…"
              />
            </div>

            <RoleSwitcher role={role} setRole={setRole} />

            <button className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Bell className="size-5" aria-hidden />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                MA
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium">M. Abandonado</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 md:px-6 md:py-8">
            {/* Live hero */}
            <section
              className="relative overflow-hidden rounded-xl border border-border bg-card"
              aria-label="Carrera en vivo"
            >
              <div
                className="absolute inset-y-0 right-0 w-1/2 opacity-[0.06]"
                style={{
                  background:
                    "repeating-linear-gradient(115deg, var(--primary) 0 2px, transparent 2px 22px)",
                }}
                aria-hidden
              />
              <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
                    <Activity className="size-4" aria-hidden /> Transmisión en vivo
                  </div>
                  <h1
                    className="mt-3 text-balance text-3xl font-bold leading-none md:text-5xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {liveRace.name}
                  </h1>
                  <p className="mt-3 max-w-md text-sm text-muted-foreground">
                    {liveRace.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <Meta label="Distancia" value={`${liveRace.distanceM} m`} />
                    <Meta label="Tipo" value={liveRace.type} />
                    <Meta label="Participantes" value={`${liveRace.registered}/${liveRace.maxParticipants}`} />
                    <Meta label="Salida" value={liveRace.startLocation} />
                  </div>
                  {canManage && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                        <Medal className="size-4" aria-hidden /> Registrar resultado
                      </button>
                      <button
                        onClick={() => setConfirmOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <TriangleAlert className="size-4" aria-hidden /> Cancelar carrera
                      </button>
                    </div>
                  )}
                </div>

                {/* Live scoreboard */}
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                    <span>Marcador</span>
                    <span className="font-mono text-primary">03:41 / vuelta 2</span>
                  </div>
                  <ol className="space-y-1.5">
                    {["c5", "c3", "c1", "c2"].map((id, i) => {
                      const c = competitorById(id)!
                      return (
                        <li
                          key={id}
                          className="flex items-center gap-3 rounded-md bg-card px-3 py-2"
                        >
                          <span
                            className={`flex size-6 items-center justify-center rounded font-mono text-xs font-bold ${
                              i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            +{(i * 1.7).toFixed(1)}s
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </div>
            </section>

            {/* KPI row */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi icon={Flag} label="Carreras próximas" value={upcoming.length} accent />
              <Kpi icon={Users} label="Competidores activos" value={activeCompetitors.length} />
              <Kpi icon={Trophy} label="Victorias de Byte" value={14} />
              <Kpi icon={Gauge} label="Mejor tiempo (1 km)" value="3:34" />
            </section>

            {/* Upcoming + recent */}
            <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Panel
                title="Próximas carreras"
                action={
                  canManage ? (
                    <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      <Plus className="size-3.5" aria-hidden /> Nueva
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Solo lectura</span>
                  )
                }
              >
                <ul className="divide-y divide-border">
                  {upcoming.map((r) => (
                    <li key={r.id} className="flex items-center gap-4 py-3">
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-lg font-bold leading-none">
                          {new Date(r.date).getDate()}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {new Date(r.date).toLocaleDateString("es-CO", { month: "short" })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.distanceM} m · {r.type} · {r.registered}/{r.maxParticipants}
                        </p>
                      </div>
                      <span className={`rounded px-2 py-1 text-[11px] font-medium ${statusChip(r.status)}`}>
                        {raceStatusLabel(r.status)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Resultados recientes">
                <ul className="space-y-3">
                  {recentResults.map((r) => (
                    <li key={r.raceId} className="rounded-lg bg-background/60 p-3">
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(r.date)} · {r.distanceM} m
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold">{r.raceName}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Trophy className="size-4 text-primary" aria-hidden />
                        <span className="font-medium">{r.winner}</span>
                        <span className="text-xs text-muted-foreground">· 2º {r.runnerUp}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </section>

            {/* Active competitors */}
            <section>
              <SectionHead title="Competidores activos" hint="Dorsales oficiales de la temporada" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {activeCompetitors.slice(0, 8).map((c, i) => (
                  <div
                    key={c.id}
                    className="group relative overflow-hidden rounded-lg border border-border bg-card p-4"
                  >
                    <span
                      className="absolute -right-2 -top-3 font-mono text-6xl font-bold text-secondary"
                      aria-hidden
                    >
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <span
                      className={`relative inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        c.type === "CAMEL" ? "bg-warning/20 text-warning" : "bg-info/15 text-info"
                      }`}
                    >
                      {c.type}
                    </span>
                    <p className="relative mt-3 text-lg font-bold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                      {c.name}
                    </p>
                    <p className="relative truncate text-xs text-muted-foreground">"{c.nickname}"</p>
                    <div className="relative mt-3 flex gap-3 text-xs">
                      <span className="text-success">{c.wins}V</span>
                      <span className="text-muted-foreground">{c.losses}D</span>
                      <span className="text-muted-foreground">{c.races} carreras</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Standings */}
            <section>
              <SectionHead title="Clasificación de competidores" hint="Puntos acumulados de la temporada" />
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Competidor</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Detalle</th>
                      <th className="px-4 py-3 text-right font-medium">Victorias</th>
                      <th className="px-4 py-3 text-right font-medium">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitorStandings.map((s, i) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-3">
                          <span
                            className={`flex size-6 items-center justify-center rounded font-mono text-xs font-bold ${
                              i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{s.detail}</td>
                        <td className="px-4 py-3 text-right font-mono">{s.wins}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* States showcase + create form + race detail */}
            <section className="grid gap-6 lg:grid-cols-2">
              <Panel
                title="Estados de interfaz"
                action={
                  <div className="flex gap-1">
                    {(["data", "loading", "empty", "error"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setDemoState(s)}
                        className={`rounded px-2 py-1 text-[11px] font-medium ${
                          demoState === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                }
              >
                <StateDemo state={demoState} />
              </Panel>

              <Panel title="Crear carrera">
                {canManage ? (
                  <RaceForm />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <TriangleAlert className="size-8 text-muted-foreground" aria-hidden />
                    <p className="text-sm font-medium">Acción no disponible</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      El rol Viewer solo puede consultar información pública. Cambia a
                      Administrator u Organizer para crear carreras.
                    </p>
                  </div>
                )}
              </Panel>
            </section>

            {/* Race detail */}
            <section>
              <SectionHead title="Detalle de carrera · Copa Camello Solitario" hint="Participantes, inscripciones y resultados" />
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Pos</th>
                      <th className="px-4 py-3 font-medium">Participante</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 text-right font-medium">Tiempo</th>
                      <th className="px-4 py-3 text-right font-medium">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {raceResults.map((res) => {
                      const c = competitorById(res.competitorId)!
                      const pts = res.finalPosition
                        ? { 1: 10, 2: 7, 3: 5, 4: 3, 5: 1 }[res.finalPosition] ?? 0
                        : 0
                      return (
                        <tr key={res.competitorId} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-mono">{res.finalPosition ?? "—"}</td>
                          <td className="px-4 py-3 font-medium">{c.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                                res.status === "FINISHED"
                                  ? "bg-success/15 text-success"
                                  : res.status === "DISQUALIFIED"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-warning/15 text-warning"
                              }`}
                            >
                              {res.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatTime(res.timeSeconds)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{pts}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}

function RoleSwitcher({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  const roles: Role[] = ["Administrator", "Race Organizer", "Viewer"]
  return (
    <div className="hidden items-center rounded-md border border-border bg-background p-0.5 lg:flex">
      {roles.map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r === "Race Organizer" ? "Organizer" : r === "Administrator" ? "Admin" : "Viewer"}
        </button>
      ))}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium">{value}</p>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Flag
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${accent ? "ring-1 ring-primary/30" : ""}`}>
      <Icon className={`size-5 ${accent ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
      <p className="mt-3 text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h2>
      <span className="hidden text-xs text-muted-foreground sm:inline">{hint}</span>
    </div>
  )
}

function StateDemo({ state }: { state: "data" | "loading" | "empty" | "error" }) {
  if (state === "loading")
    return (
      <div className="space-y-3 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
            </div>
          </div>
        ))}
        <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando resultados…
        </p>
      </div>
    )
  if (state === "empty")
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <Flag className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Sin carreras programadas</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Aún no hay eventos en el calendario. Crea la primera carrera de la temporada.
        </p>
      </div>
    )
  if (state === "error")
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-10 text-center">
        <TriangleAlert className="size-8 text-destructive" aria-hidden />
        <p className="text-sm font-medium text-destructive">No se pudo cargar la información</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Error 503: el servicio de resultados no responde. Intenta nuevamente.
        </p>
        <button className="mt-1 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/15">
          Reintentar
        </button>
      </div>
    )
  return (
    <ul className="space-y-2">
      {competitors.slice(0, 4).map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-md bg-background/60 px-3 py-2">
          <div className="flex size-9 items-center justify-center rounded bg-secondary text-xs font-bold">
            {c.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">{c.origin}</p>
          </div>
          <span className="text-xs text-success">{c.status}</span>
        </li>
      ))}
    </ul>
  )
}

function RaceForm() {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <Field label="Nombre de la carrera" required>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Gran Clásico del Kilómetro"
          defaultValue="Gran Clásico del Kilómetro"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Distancia (m)" required>
          <input
            type="number"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue={1000}
          />
        </Field>
        <Field label="Máx. participantes" required>
          <input
            type="number"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue={8}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option>MIXED</option>
            <option>INDIVIDUAL</option>
            <option>TEAM</option>
          </select>
        </Field>
        <Field label="Fecha y hora">
          <input
            type="datetime-local"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            defaultValue="2026-08-15T14:00"
          />
        </Field>
      </div>
      <Field label="Cierre de inscripción" error="Debe ser anterior a la hora de inicio.">
        <input
          type="datetime-local"
          className="w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          defaultValue="2026-08-15T15:00"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
          Cancelar
        </button>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Crear carrera
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  )
}

function ConfirmDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <TriangleAlert className="size-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
              ¿Cancelar la carrera?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vas a cancelar <span className="font-medium text-foreground">Duelo de Excepciones</span>.
              Esta acción no se puede deshacer y notificará a los 10 participantes inscritos.
            </p>
          </div>
          <button onClick={onCancel} className="ml-auto rounded p-1 text-muted-foreground hover:bg-secondary">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
            Volver
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Trash2 className="size-4" aria-hidden /> Sí, cancelar carrera
          </button>
        </div>
      </div>
    </div>
  )
}
