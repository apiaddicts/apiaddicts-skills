# Demos

Casos de prueba de punta a punta de las skills, contra [httpbin.org](https://httpbin.org/#/). Cada demo es independiente y trae su propia definición de la API (`httpbin.yaml`) con **2 paths**:

| Path | Qué prueba | Resultado esperado |
|---|---|---|
| `GET /bearer` | Autenticación Bearer: 200 con token, 401 sin token | ✅ Pasa todo |
| `POST /post` | Body `Mascota` con campos requeridos y restricciones (`maxLength`, `maximum`, tipos) | ✅ 200 pasa. ❌ Los 5 casos 400 fallan **a propósito**: httpbin no valida el body y devuelve 200, lo que sirve para ver cómo se reportan los fallos de contrato |

| Demo | Skill | Contenido |
|---|---|---|
| [`demo01-generacion-coleccion`](demo01-generacion-coleccion) | `generar-coleccion-postman` | Spec + config → colección y entorno Postman en `out/` |
| [`demo02-pruebas-newman`](demo02-pruebas-newman) | `ejecutar-pruebas-postman` (Newman) | Genera la colección y la ejecuta con Newman. Reportes JSON, JUnit y HTML en `reportes/` |
| [`demo03-pruebas-postmancli`](demo03-pruebas-postmancli) | `ejecutar-pruebas-postman` (Postman CLI) | Igual que demo02, pero con Postman CLI |

Versiones usadas: openapi2postman 2.4.3, Newman 6, newman-reporter-htmlextra, Postman CLI 1.62.0 y Node 25.

Nota: httpbin devuelve la IP pública de quien llama en el campo `origin`. En los reportes guardados se reemplazó por `0.0.0.0`. Si regeneras los reportes, revísalos antes de commitearlos.
