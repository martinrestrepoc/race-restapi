import Keycloak from 'keycloak-js';
import type {
  KeycloakInitOptions,
  KeycloakLoginOptions,
  KeycloakLogoutOptions,
} from 'keycloak-js';

import type { PublicEnvironment } from '@/config/environment';

export interface AuthClient {
  authenticated: boolean;
  clearToken: () => void;
  init: (options: KeycloakInitOptions) => Promise<boolean>;
  login: (options?: KeycloakLoginOptions) => Promise<void>;
  logout: (options?: KeycloakLogoutOptions) => Promise<void>;
  token?: string;
  updateToken: (minValidity?: number) => Promise<boolean>;
}

const initializationOptions: KeycloakInitOptions = {
  checkLoginIframe: false,
  flow: 'standard',
  onLoad: 'check-sso',
  pkceMethod: 'S256',
  responseMode: 'query',
};

const initializationPromises = new WeakMap<AuthClient, Promise<boolean>>();

let singletonClient: AuthClient | undefined;
let singletonConfiguration: string | undefined;

export function getKeycloakClient(environment: PublicEnvironment): AuthClient {
  const configuration = JSON.stringify({
    url: environment.keycloakUrl,
    realm: environment.keycloakRealm,
    clientId: environment.keycloakClientId,
  });

  if (singletonClient && singletonConfiguration !== configuration) {
    throw new Error('La configuración de acceso cambió. Recarga la página.');
  }

  if (!singletonClient) {
    singletonClient = new Keycloak({
      url: environment.keycloakUrl,
      realm: environment.keycloakRealm,
      clientId: environment.keycloakClientId,
    });
    singletonConfiguration = configuration;
  }

  return singletonClient;
}

export function initializeKeycloak(client: AuthClient): Promise<boolean> {
  const existing = initializationPromises.get(client);
  if (existing) return existing;

  const initialization = client.init(initializationOptions);
  initializationPromises.set(client, initialization);
  return initialization;
}

export async function getFreshAccessToken(client: AuthClient): Promise<string> {
  try {
    await client.updateToken(30);
  } catch {
    client.clearToken();
    throw new AuthenticationExpiredError();
  }

  if (!client.token) {
    client.clearToken();
    throw new AuthenticationExpiredError();
  }

  return client.token;
}

export class AuthenticationExpiredError extends Error {
  constructor() {
    super('The authenticated session is no longer available.');
    this.name = 'AuthenticationExpiredError';
  }
}
