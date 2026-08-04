# Colección Postman del API

La estrategia elegida es una sola colección versionada, dividida en carpetas por
módulo. Así la autenticación, las variables encadenadas, el contrato global de
errores y el flujo carrera-inscripción-resultado-clasificación se definen una sola
vez sin duplicar configuración.

## Archivos

- `project-api.postman_collection.json`: colección Postman v2.1 con pruebas.
- `local.postman_environment.json`: ambiente local sin tokens ni secretos.

La colección cubre los endpoints implementados de sistema, autenticación, usuarios,
competidores, equipos/membresías, carreras, inscripciones, resultados,
clasificaciones y auditoría. Incluye rutas felices, validación `400`, autenticación
`401`, autorización `403`, recursos inexistentes `404`, conflictos `409`,
paginación, filtros y transiciones de estado.

## Preparación

1. Inicie PostgreSQL, Keycloak y el backend.
2. Aplique migraciones y, opcionalmente, el dataset demostrativo:

   ```bash
   cd backend
   npm run migration:run
   npm run seed
   ```

3. Importe ambos JSON en Postman.
4. Seleccione **Race Management API - Local**.

La colección utiliza el cliente público de desarrollo `race-postman`, configurado
con Authorization Code y PKCE S256. No usa Client Credentials, Direct Access Grants
ni secretos de cliente.

## Obtener los tres tokens

En Postman, use **Get New Access Token** con estos valores:

| Campo | Valor |
| --- | --- |
| Grant Type | Authorization Code (With PKCE) |
| Callback URL | `https://oauth.pstmn.io/v1/callback` |
| Auth URL | `{{keycloakBaseUrl}}/realms/{{keycloakRealm}}/protocol/openid-connect/auth` |
| Access Token URL | `{{keycloakBaseUrl}}/realms/{{keycloakRealm}}/protocol/openid-connect/token` |
| Client ID | `{{postmanClientId}}` (`race-postman`) |
| Client Secret | vacío |
| Code Challenge Method | SHA-256 |
| Scope | `openid profile email` |

Repita el inicio de sesión con cada identidad de demostración y copie únicamente el
access token al valor **Current value** correspondiente del ambiente:

- `administratorAccessToken`
- `organizerAccessToken`
- `viewerAccessToken`

No escriba tokens en **Initial value**, no exporte el ambiente después de cargarlos
y no los confirme en Git. Los tokens expiran; renuévelos antes de otra ejecución.

El import de realm crea `race-postman` solo en una base de Keycloak nueva. Keycloak
no reaplica cambios del JSON sobre un realm persistido: en un entorno local ya
existente, cree el cliente con la misma configuración mediante la consola de
administración o reinicialice deliberadamente el volumen solo si puede descartar
sus datos locales.

## Ejecución

Use Collection Runner y ejecute la colección completa en el orden exportado, con
iteración única y sin paralelismo. El orden crea y captura automáticamente los IDs
que necesitan las solicitudes posteriores.

Las pruebas de colección verifican para todas las respuestas:

- tiempo máximo configurable mediante `maxResponseTimeMs`;
- código esperado indicado como prefijo `[200]`, `[201]`, `[204]`, etc.;
- JSON y `Content-Type` donde corresponde;
- cuerpo vacío para `204`;
- contrato global para todos los errores: `timestamp`, `statusCode`, `error`,
  `message` y `path`.

Los escenarios existentes de competidores y equipos agregan aserciones específicas
sobre DTOs, filtros, historiales, campos de validación y mensajes de conflicto.

## Variables encadenadas

La colección genera datos con sufijos aleatorios y conserva como variables de
colección los IDs de competidores, equipos, carrera, inscripciones, resultados,
perfil actual y auditoría. No es necesario copiar identificadores manualmente.

Los tres tokens permanecen en el ambiente. El token de administrador es la
autorización heredada por defecto; las pruebas de viewer lo reemplazan de forma
explícita y la prueba de `401` usa `No Auth`.

## Efectos sobre datos

- Ejecute la colección solo contra desarrollo o una base de pruebas.
- La colección crea datos reales y eventos de auditoría.
- Los recursos desechables dedicados a comprobar `DELETE` se eliminan.
- El flujo principal y algunos historiales permanecen para inspección posterior.
- Los UUID aleatorios evitan conflictos entre ejecuciones, pero cada ejecución
  agrega un nuevo flujo principal.

Para una corrida totalmente limpia, use el PostgreSQL aislado de
`compose.test.yml` o reinicie únicamente una base de pruebas que pueda descartarse.
