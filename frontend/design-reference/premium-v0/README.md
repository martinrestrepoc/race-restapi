# Dirección 1 — Liga Deportiva Premium (Vite + React)

Paquete listo para pegar en un proyecto **Vite + React + TypeScript + Tailwind v4**.

## Archivos

| Archivo | Qué es |
|---|---|
| `PremiumDashboard.tsx` | Componente principal del dashboard (autocontenido, sin shadcn). |
| `data.ts` | Tipos de dominio + datos mock (competidores, carreras, resultados, clasificación). |
| `premium-theme.css` | Tokens de diseño + paleta oscura `.theme-premium` para Tailwind v4. |
| `fonts.ts` | Imports de fuentes vía `@fontsource`. |

## Dependencias

```bash
pnpm add react-router-dom lucide-react
pnpm add @fontsource/inter @fontsource/oswald @fontsource/jetbrains-mono
```

Requiere Tailwind v4 ya configurado (`@import "tailwindcss";` en tu CSS global).

## Instalación (4 pasos)

**1. Copia la carpeta** `premium/` dentro de tu `src/` → `src/premium/`.

**2. Fuentes.** En tu entrypoint (`src/main.tsx`), importa una vez:

```ts
import "./premium/fonts"
```

**3. Estilos.** Pega el contenido de `premium-theme.css` en tu CSS global,
justo **después** de `@import "tailwindcss";`. (O impórtalo: `import "./premium/premium-theme.css"`.)

> Si ya usas shadcn/ui, los bloques `@theme inline` se fusionan sin problema.
> Si no lo usas, este archivo ya define todos los tokens que necesita el dashboard.

**4. Ruteo.** El dashboard usa `<Link to="/">` de `react-router-dom`.
Móntalo dentro de tu `<BrowserRouter>`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { PremiumDashboard } from "./premium/PremiumDashboard"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/liga" element={<PremiumDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## Notas

- El componente ya viene envuelto en `<div className="theme-premium">`, así que la
  paleta se activa sola sin tocar el resto de tu app.
- No depende de ningún componente de shadcn/ui: son `div`/`button` con clases Tailwind.
- Los datos son 100% mock (`data.ts`). Cuando conectes tu REST API, reemplaza los
  arrays exportados por tus llamadas (fetch/react-query/SWR) manteniendo los mismos tipos.
- El enlace "Direcciones" (`to="/"`) puedes cambiarlo o quitarlo según tu ruteo.
