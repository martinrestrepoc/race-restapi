interface ConfigurationErrorProps {
  message: string;
}

export function ConfigurationError({ message }: ConfigurationErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section
        aria-labelledby="configuration-error-title"
        className="w-full max-w-xl rounded-xl border border-destructive/60 bg-card p-8"
        role="alert"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-destructive">
          Error de configuración
        </p>
        <h1
          className="mt-3 font-display text-3xl font-bold uppercase"
          id="configuration-error-title"
        >
          No se puede iniciar el frontend
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">{message}</p>
        <p className="mt-5 text-sm text-muted-foreground">
          Revisa las variables públicas documentadas en{' '}
          <code className="font-mono text-foreground">
            frontend/.env.example
          </code>
          .
        </p>
      </section>
    </main>
  );
}
