export function ConfigurationError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section
        aria-labelledby="configuration-error-title"
        className="w-full max-w-xl rounded-xl border border-destructive/60 bg-card p-8"
        role="alert"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-destructive">
          Acceso no disponible
        </p>
        <h1
          className="mt-3 font-display text-3xl font-bold uppercase"
          id="configuration-error-title"
        >
          No se puede iniciar la aplicación
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          La aplicación no está disponible en este momento. Contacta a un
          administrador.
        </p>
      </section>
    </main>
  );
}
