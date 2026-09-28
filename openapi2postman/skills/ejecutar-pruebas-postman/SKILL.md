---
name: ejecutar-pruebas-postman
description: Ejecuta los contract tests de una colección Postman (la generada por openapi2postman u otra) desde línea de comandos con Newman o Postman CLI. Comprueba si la herramienta ya está instalada y, si no, pide permiso para instalarla de forma global o temporal (npx). Pregunta el formato de reporte (cli, json, junit, html) y la carpeta de salida, deja el reporte en esa carpeta y entrega un resumen de alto nivel de pruebas pasadas y fallidas con los motivos de fallo. Úsala cuando el usuario pida ejecutar/correr las pruebas, los contract tests o la colección Postman, lanzar Newman o Postman CLI, sacar un reporte JUnit/HTML de las pruebas, o pregunte por qué fallaron, incluso si no nombra la herramienta. NO cubre generar la colección (usa `generar-coleccion-postman`) ni instalar openapi2postman.
---

# Ejecutar contract tests Postman (Newman / Postman CLI)

Esta skill ejecuta una colección `.postman_collection.json` con su entorno `.postman_environment.json`, deja el reporte donde pida el usuario y resume el resultado. Verificado con **Newman 6** y **Postman CLI 1.62.0** sobre colecciones generadas por openapi2postman 2.4.3.

Sigue los pasos en orden. **No ejecutes nada contra una API sin que el usuario haya confirmado colección, entorno y host** (paso 1).

## Paso 1: identificar qué se va a ejecutar

1. Pedí o localizá la **colección** y el **entorno**. Si vienen de openapi2postman, están en el `target_folder` de la config.
2. Leé el entorno y mostrale al usuario el `host` (+ `port` + `basePath`) contra el que se va a ejecutar. Pedí confirmación.
3. **Revisá el entorno antes de ejecutar** y avisá si encontrás algo de esto (no lo rellenes por tu cuenta):
   - `host` vacío: todas las requests van a fallar.
   - Tokens vacíos: la variable con nombre del security scheme, `not_authorized_token`, `forbidden_token`. Sin ellos fallan los casos con auth.
   - Valores de relleno de openapi2postman (`anystring`, `anydate`, `badstring`): el backend real puede rechazarlos en los casos 2xx.
   - La request `Get OAuth2 Token` con usuario y contraseña `cambiame`.
4. **Entornos reales con escritura**: si la colección tiene POST/PUT/PATCH/DELETE (se generó sin `read_only: true`) y el host no es local/desarrollo, advertí que **va a crear, modificar o borrar datos** y pedí confirmación explícita.

## Paso 2: elegir herramienta

Presentá las dos opciones y preguntá cuál usar:

| | **Newman** | **Postman CLI** |
|---|---|---|
| Qué es | Runner open source de Postman (Apache-2.0), paquete npm `newman` | CLI oficial de Postman, binario propietario (npm `postman-cli`) |
| Tamaño | Pequeño | ~292 MB (npm baja el binario de la plataforma: Windows x64, macOS x64/arm64, Linux x64/arm64) |
| Login | Nunca | No hace falta para archivos locales. Muestra `No authorization data found...` pero ejecuta igual |
| Telemetría | No | **Envía analíticas por defecto**: usar siempre `--no-report-events`. Además guarda un `installationId` en `~/.postman/postmanrc` y comprueba actualizaciones |
| Reportes incluidos | cli, json, junit. HTML con el reporter extra `newman-reporter-htmlextra` | cli, json, junit, html |
| Recomendada para | CI/pipelines, entornos sin cuenta Postman | Equipos que ya usan Postman Cloud |

Ambas requieren Node.js + npm para instalarse por npm (`node -v`, `npm -v`).

## Paso 3: comprobar si está instalada

```bash
newman --version      # Newman
postman --version     # Postman CLI
```

- Si responde una versión, la herramienta está instalada. Para Postman CLI, confirmá además que es la CLI y no otra cosa en el PATH: `postman collection run --help` tiene que listar opciones como `--reporter-json-structure`.
- Si falla con "command not found" o "no se reconoce", **no está instalada**. Pasá al paso 4.

## Paso 4: si no está instalada, pedir permiso

**Nunca instales sin permiso.** Ofrecé las dos modalidades y esperá la respuesta:

| Modalidad | Newman | Postman CLI | Qué deja en la máquina |
|---|---|---|---|
| **Global** | `npm install -g newman` (+ `npm install -g newman-reporter-htmlextra` si quiere HTML) | `npm install -g postman-cli` | Queda instalada y en el PATH. Se quita con `npm uninstall -g <paquete>` |
| **Temporal** (solo esta ejecución) | `npx -y -p newman@6 newman run ...` (+ `-p newman-reporter-htmlextra` si quiere HTML) | `npx -y -p postman-cli postman collection run ...` | Nada en el PATH. Solo queda en la caché de npm (`npm cache clean --force` para limpiarla). La primera vez tarda en descargar (Postman CLI ~30 s) |

Notas:
- El reporter HTML "clásico" `newman-reporter-html` **no es compatible con Newman 6** (npm falla con `ERESOLVE`). Usá `newman-reporter-htmlextra`.
- Si el usuario elige global y `npm install -g` falla por permisos (`EACCES` en Linux/Mac), no uses `sudo`: proponé la modalidad temporal.

## Paso 5: preguntar formato de reporte y carpeta de salida

Preguntá las dos cosas, sin asumir:

1. **Formato(s)**, se pueden combinar:
   - `cli`: salida en consola (siempre se incluye, para ver el progreso).
   - `json`: reporte máquina-legible.
   - `junit`: XML para CI (Jenkins, GitLab, Azure DevOps). Un `testsuite` por caso y un `testcase` por assertion.
   - `html`: reporte navegable (Newman: `htmlextra`; Postman CLI: `html` incluido).
2. **Carpeta de salida**, ej. `./reportes`. Ambas herramientas crean la carpeta si no existe.

El resumen del paso 7 necesita un JSON con estructura Newman. **Si el usuario no pidió `json`, generalo igual** en la misma carpeta (`resumen.json`) y avisale. Si prefiere no dejarlo, borralo al final.

## Paso 6: ejecutar

Variables usadas abajo: `COL` = colección, `ENV` = entorno, `OUT` = carpeta de salida.

### Newman

```bash
newman run "$COL" -e "$ENV" \
  -r cli,json,junit,htmlextra \
  --reporter-json-export "$OUT/resultado.json" \
  --reporter-junit-export "$OUT/resultado.xml" \
  --reporter-htmlextra-export "$OUT/resultado.html"
```
Incluí en `-r` y en los `--reporter-*-export` **solo** los formatos elegidos (+ json). En modo temporal, reemplazá `newman` por `npx -y -p newman@6 -p newman-reporter-htmlextra newman` (el `-p newman-reporter-htmlextra` solo si pidió HTML).

### Postman CLI

```bash
postman collection run "$COL" -e "$ENV" --no-report-events \
  -r cli,json,junit,html \
  --reporter-json-structure newman \
  --reporter-json-export "$OUT/resultado.json" \
  --reporter-junit-export "$OUT/resultado.xml" \
  --reporter-html-export "$OUT/resultado.html"
```
- **`--reporter-json-structure newman` es obligatorio** para que funcione el resumen. La estructura nativa es distinta y el script la rechaza.
- **Siempre `--no-report-events`**, salvo que el usuario quiera explícitamente enviar resultados a Postman.
- No combines `--output` con `-r`: la CLI lo rechaza.
- Modo temporal: reemplazá `postman` por `npx -y -p postman-cli postman`.

### Opciones útiles (ambas herramientas)

| Necesidad | Opción |
|---|---|
| Ejecutar solo una carpeta o caso | Newman: `--folder "<nombre>"`. Postman CLI: `-i "<nombre>"` (repetible, respeta el orden). Usar el nombre exacto de la carpeta, ej. `001.pets`. En Postman CLI, la ruta `"carpeta/subcarpeta"` **no** funcionó con estas colecciones: usá solo el nombre |
| Sobrescribir una variable | `--env-var "host=https://api.x.com"` |
| Certificados self-signed | `-k` / `--insecure` |
| Timeout por request | `--timeout-request 10000` |
| Cortar al primer error | `--bail` |
| No fallar el proceso por tests rojos | `-x` / `--suppress-exit-code` |

**Tokens OAuth2 en colecciones de openapi2postman**: la carpeta `000.authorizations` obtiene el token y lo guarda en el entorno para el resto de la corrida. Si filtrás carpetas, incluila primero (Postman CLI: `-i "000.authorizations" -i "001.pets"`). Si no, los casos con auth van sin token.

**Código de salida**: `0` si pasa todo, `1` si falla algún test o request (verificado en ambas). En CI eso sirve como quality gate. Un exit `1` **no** es un error de la skill: igual hay que generar el resumen.

## Paso 7: resumen de alto nivel

Ejecutá el script incluido en esta skill sobre el JSON:

```bash
node <carpeta-de-esta-skill>/scripts/resumen-reporte.js "$OUT/resultado.json"
# opcional: --max-fallos 20   (por defecto lista hasta 50 casos fallidos)
```

Devuelve en Markdown: total de casos pasados y fallidos con % de éxito, assertions, duración, una tabla por carpeta (recurso), los **motivos de fallo más frecuentes** agrupados (ej. `8 × status esperado 400, recibido 200`, `respuesta no cumple el schema (AJV)`, `error de conexión: ENOTFOUND`) y la lista de casos fallidos con cada assertion roja.

Al usuario entregale:
1. Ruta(s) de los reportes generados.
2. Totales: pasados / fallidos / % éxito.
3. Motivos de fallo principales, **interpretados**. Pistas para colecciones de openapi2postman:
   - Muchos `status esperado 400, recibido 200/201`: la API no valida la entrada (campos requeridos o tipos) como declara el spec.
   - `status esperado 2xx, recibido 400`: revisar los valores de relleno del entorno o, si se generó sin `is_inline: true`, números y booleanos enviados como string.
   - `status esperado 404, recibido 200`: la API no devuelve 404 para IDs inexistentes.
   - `status esperado 401/403, recibido 2xx`: el endpoint no está protegido como dice el spec, o los tokens `not_authorized_token`/`forbidden_token` están mal cargados.
   - `respuesta no cumple el schema (AJV)`: la respuesta no coincide con el contrato. El detalle AJV está en el reporte JSON/HTML.
   - `error de conexión`: host incorrecto, VPN o certificados (`-k`).
   - Casi todo falla con 401: falta el token o falló la request de `000.authorizations`.
4. No inventes causas: si el motivo no es claro, decilo y apuntá al caso concreto en el reporte.

## Fuera de alcance

- Generar o regenerar la colección (ver skill `generar-coleccion-postman`)
- Instalar Node.js/npm
- Corregir la API o el spec según los fallos (solo se reportan e interpretan)
- Ejecutar desde la app de escritorio de Postman (Collection Runner): es manual; si el usuario lo prefiere, indicale importar colección + entorno y usar "Run collection"
