# `race-management` login theme

This theme is compatible with the Keycloak version pinned by the image
(`26.7.0`). It inherits `keycloak.v2`, so Keycloak continues to own and render
sign-in, invalid-credential, recovery, required-action, information, and error
flows. The repository only overrides presentation and messages.

All assets are local and versioned. Do not add a CDN, frontend-managed password
form, token, client secret, or environment-specific credential.

## Structure and local preview

```text
login/
├── theme.properties
├── messages/
│   ├── messages_en.properties
│   └── messages_es.properties
└── resources/
    ├── css/login.css
    └── img/racing-mark.svg
```

From the repository root, build and start the pinned theme image with
`docker compose up -d --build keycloak`, then open the graphical application at
`http://localhost:5173` and choose **Iniciar sesión**. The redirect must show the
league mark and dark/lime theme on Keycloak-owned login, error, and recovery pages.
For automated coverage, run `npm run test:e2e -- --grep "branded Keycloak"` from
`frontend/` while the complete Compose stack is healthy.

The theme relies on its parent's semantic form structure. Its stylesheet preserves
visible keyboard focus, responsive widths, reduced motion, high-contrast messages,
and zoom-safe sizing; test these rather than copying parent templates.

Before changing Keycloak versions:

1. Review the upstream theme migration notes and `keycloak.v2` templates.
2. Build the Keycloak image; its validation step must pass.
3. Exercise sign-in, invalid credentials, recovery, required actions, expired
   sessions, and provider errors at mobile and desktop widths using keyboard only.
4. Confirm labels, error associations, focus visibility, 200% zoom, and contrast.

The safe fallback is the built-in `keycloak.v2` parent. If a compatibility issue
is found, select `keycloak.v2` under **Realm settings > Themes > Login theme** (or
temporarily set `"loginTheme": "keycloak.v2"` in the import for a clean local
environment) and rebuild. Authentication remains in Keycloak in either case.
