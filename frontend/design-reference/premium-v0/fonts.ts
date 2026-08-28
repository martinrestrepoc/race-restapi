/* ============================================================
   Fuentes de la Dirección 1 — vía @fontsource (self-hosted)
   ------------------------------------------------------------
   1. Instala los paquetes:
      pnpm add @fontsource/inter @fontsource/oswald @fontsource/jetbrains-mono
      (o npm install / yarn add)

   2. Importa este archivo UNA sola vez, en tu entrypoint
      (por ejemplo src/main.tsx):  import "./premium/fonts"

   Cada import registra la familia con su nombre real
   ("Inter", "Oswald", "JetBrains Mono"), que es el que usa
   premium-theme.css.
   ============================================================ */

// Inter — texto de cuerpo (font-sans)
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/inter/700.css"

// Oswald — titulares / display (font-display)
import "@fontsource/oswald/500.css"
import "@fontsource/oswald/600.css"
import "@fontsource/oswald/700.css"

// JetBrains Mono — datos, tiempos, posiciones (font-mono)
import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/500.css"
import "@fontsource/jetbrains-mono/700.css"
