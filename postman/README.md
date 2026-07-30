# Colección Postman del API

Esta carpeta contiene pruebas importables del comportamiento actualmente
implementado en NestJS:

- CRUD, filtros, paginación y estados de competidores.
- CRUD, filtros, paginación y estados de equipos.
- Creación, finalización, historial y conflictos de membresías.
- Validaciones de DTO, recursos inexistentes y conflictos de negocio.

## Archivos

- `project-api.postman_collection.json`: colección Postman v2.1.
- `local.postman_environment.json`: ambiente para el API local.

## Importación y ejecución

1. Levante PostgreSQL y el backend.
2. En Postman, seleccione **Import** e importe los dos archivos JSON.
3. Active el ambiente **Race Management API - Local**.
4. Ejecute la colección completa con el Collection Runner, respetando el orden
   definido.

El ambiente configura:

```text
baseUrl=http://localhost:3000/api/v1
maxResponseTimeMs=2000
```

Todas las solicitudes usan `{{baseUrl}}`. Puede cambiar
`maxResponseTimeMs` si el entorno local necesita un umbral diferente.

## Variables automáticas

La colección genera sufijos aleatorios para evitar conflictos entre ejecuciones y
guarda automáticamente los identificadores creados como variables de colección:

- `competitorId`
- `competitorDeleteId`
- `teamId`
- `teamDeleteId`
- `teamMemberCompetitorId`
- `membershipId`
- `conflictTeamId`

La carpeta de equipos crea su propio competidor auxiliar, por lo que puede probar
sus membresías sin reutilizar manualmente un ID de la carpeta de competidores.

## Organización

Cada recurso se divide en:

- `Happy path`
- `Validaciones`
- `Recursos inexistentes`
- `Conflictos`

No existe una carpeta de autorización porque los controladores actuales no tienen
guards ni endpoints protegidos. Agregar expectativas `401` o `403` en este momento
inventaría un comportamiento que el backend todavía no implementa.

## Consideraciones

- La colección crea datos reales en la base configurada.
- Los recursos creados específicamente para comprobar eliminación física se
  eliminan durante la ejecución.
- Los recursos principales y los historiales de membresía permanecen para poder
  inspeccionarlos después.
- Los mensajes de `404` y `409`, los campos de respuesta y las restricciones usadas
  por los scripts provienen de los controladores, DTO, servicios y filtro global de
  excepciones actuales.
- Todos los errores se validan contra la forma
  `timestamp`, `statusCode`, `error`, `message` y `path`. Los errores de DTO también
  verifican `details`.
