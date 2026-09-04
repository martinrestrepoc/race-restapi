import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ConfigurationError } from '@/app/ConfigurationError';
import { RootApplication } from '@/app/RootApplication';
import { loadPublicEnvironment } from '@/config/environment';
import '@/styles/fonts';
import '@/styles/index.css';

const rootElement = document.querySelector<HTMLDivElement>('#root');

if (!rootElement) {
  throw new Error('No se encontró el elemento raíz de la aplicación.');
}

const root = createRoot(rootElement);

try {
  const environment = loadPublicEnvironment();

  root.render(
    <StrictMode>
      <RootApplication environment={environment} />
    </StrictMode>,
  );
} catch {
  root.render(
    <StrictMode>
      <ConfigurationError />
    </StrictMode>,
  );
}
