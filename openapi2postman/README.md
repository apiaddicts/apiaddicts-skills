# openapi2postman skills

Estas skills automatizan el uso de [openapi2postman](https://github.com/apiaddicts/openapi2postman) para crear contract tests: generar colecciones Postman a partir de un spec OpenAPI y ejecutarlas desde línea de comandos o pipeline. No reemplazan la herramienta — automatizan cómo invocarla.

Empaquetadas para instalarse con `npx skills`, funcionan en cualquier agente compatible (Claude Code, Cursor, Codex, OpenCode, y más). Ver [vercel-labs/skills](https://github.com/vercel-labs/skills).

## Instalación

```bash
# Instalar todas las skills, para un agente específico
npx skills add apiaddicts/openapi2postman-skills --skill '*' -a claude-code

# Instalación interactiva (elegir skills)
npx skills add apiaddicts/openapi2postman-skills

# Desde una copia local (para probar antes de publicar)
npx skills add ./openapi2postman-skills
```

## Skills incluidas

| Skill | Qué hace |
|---|---|
| [`instalar-openapi2postman`](skills/instalar-openapi2postman) | Instala la herramienta openapi2postman (`o2p`): global con npm, como dependencia local del proyecto/pipeline, o desde el código fuente. Incluye requisitos reales (Node 16+), verificación y limitaciones conocidas (p. ej. `npx` no funciona). |
| [`generar-coleccion-postman`](skills/generar-coleccion-postman) | Genera contract tests en formato Postman (colección + entorno) desde un spec OpenAPI con `o2p`: archivo de configuración completo, casos generados (2xx, 400, 401, 403, 404), autenticación y limitaciones verificadas del spec. |
| [`ejecutar-pruebas-postman`](skills/ejecutar-pruebas-postman) | Ejecuta la colección con Newman o Postman CLI: comprueba si la herramienta está instalada (si no, pide permiso para instalarla global o temporal con `npx`), pregunta formato de reporte (cli, json, junit, html) y carpeta de salida, y resume pruebas pasadas/fallidas con sus motivos. |

Flujo típico: instalar la herramienta con `instalar-openapi2postman` → generar la colección con `generar-coleccion-postman` → ejecutarla con `ejecutar-pruebas-postman`.

## Demos

La carpeta [`demo/`](demo) tiene casos de punta a punta contra [httpbin.org](https://httpbin.org): generación de la colección, ejecución con Newman y ejecución con Postman CLI, con sus reportes.

## Dependencias externas por skill

- `instalar-openapi2postman`: Node.js 16+ y npm. `git` solo si se instala desde el código fuente.
- `ejecutar-pruebas-postman`: Node.js + npm, y Newman o Postman CLI (la skill ofrece instalarlos). Acceso de red al host de la API.
- `generar-coleccion-postman`: openapi2postman instalado y un spec OpenAPI en YAML (2.0, 3.0–3.0.3, 3.1–3.1.2 o 3.2).

## Origen

Automatiza el uso de [apiaddicts/openapi2postman](https://github.com/apiaddicts/openapi2postman), la herramienta que convierte specs OpenAPI en colecciones Postman con contract tests. Estas skills no la reemplazan — documentan y automatizan cómo llamarla y cómo ejecutar lo que genera.
