# apiaddicts-skills

Skills para agentes que permiten trabajar con las herramientas de [apiaddicts](https://github.com/apiaddicts). Las skills no reemplazan a las herramientas: automatizan cómo instalarlas, invocarlas y ejecutarlas desde cualquier agente compatible (Claude Code, Cursor, Codex, OpenCode y más).

Empaquetadas para instalarse con [`npx skills`](https://github.com/vercel-labs/skills).

## Instalación

```bash
# Todas las skills, para un agente concreto
npx skills add apiaddicts/apiaddicts-skills --skill '*' -a claude-code

# Interactivo (elegir skills y agentes)
npx skills add apiaddicts/apiaddicts-skills

# Una sola skill
npx skills add apiaddicts/apiaddicts-skills --skill generar-coleccion-postman

# Desde una copia local (para probar antes de publicar)
npx skills add ./apiaddicts-skills
```

## Skills

### [ApiGen](apigen.net) — proyectos .NET hexagonales desde OpenAPI

Automatiza [apiaddicts/apigen.net](https://github.com/apiaddicts/apigen.net).

| Skill | Qué hace |
|---|---|
| [`apigen-cli`](apigen.net/skills/apigen-cli) | Instala (si hace falta) y ejecuta el CLI `apigen` para generar un proyecto .NET hexagonal a partir de un spec OpenAPI. |
| [`apigen-api`](apigen.net/skills/apigen-api) | Genera el proyecto llamando a la REST API de ApiGen (`POST /generator/file`) en vez del CLI local. Requiere `APIGEN_API_KEY`. |
| [`apigen-openapi-check`](apigen.net/skills/apigen-openapi-check) | Valida de forma determinista (script Python) que un spec OpenAPI tenga las extensiones `x-apigen-*` que el generador realmente lee. |
| [`apigen-openapi-enrich`](apigen.net/skills/apigen-openapi-enrich) | Redacta y agrega las extensiones `x-apigen-*` que faltan en un spec OpenAPI nuevo o incompleto. |

Flujo típico: `apigen-openapi-enrich` → `apigen-openapi-check` → `apigen-cli` o `apigen-api`.

### [openapi2postman](openapi2postman) — contract tests Postman desde OpenAPI

Automatiza [apiaddicts/openapi2postman](https://github.com/apiaddicts/openapi2postman).

| Skill | Qué hace |
|---|---|
| [`instalar-openapi2postman`](openapi2postman/skills/instalar-openapi2postman) | Instala openapi2postman (`o2p`): npm global, dependencia local del proyecto/pipeline o desde el código fuente. Requiere Node 16+. |
| [`generar-coleccion-postman`](openapi2postman/skills/generar-coleccion-postman) | Genera contract tests Postman (colección + entorno) a partir de un spec OpenAPI con `o2p`, incluyendo el archivo de configuración completo, los casos generados (2xx, 400, 401, 403, 404) y las limitaciones conocidas del spec. |
| [`ejecutar-pruebas-postman`](openapi2postman/skills/ejecutar-pruebas-postman) | Ejecuta la colección con Newman o Postman CLI, genera un reporte (cli, json, junit, html) y resume las pruebas pasadas y fallidas. |

Flujo típico: `instalar-openapi2postman` → `generar-coleccion-postman` → `ejecutar-pruebas-postman`. Ver [`openapi2postman/demo`](openapi2postman/demo) para ejemplos de punta a punta.

### [openapi2soapui](openapi2soapui) — proyectos SoapUI desde OpenAPI

Automatiza [apiaddicts/openapi2soapui](https://github.com/apiaddicts/openapi2soapui).

| Skill | Qué hace |
|---|---|
| [`generar-proyecto-soapui`](openapi2soapui/skills/generar-proyecto-soapui) | Llama a la API de openapi2soapui para generar un proyecto SoapUI en XML a partir de un spec OpenAPI (v2/v3), con el contrato completo del request (parámetros, defaults, validaciones). |
| [`ejecutar-proyecto-soapui`](openapi2soapui/skills/ejecutar-proyecto-soapui) | Instala/localiza y ejecuta SoapUI TestRunner CLI sobre un proyecto generado (Java + jar de Maven, imagen Docker oficial o instalación existente). |

Flujo típico: `generar-proyecto-soapui` → `ejecutar-proyecto-soapui`. Ver [`openapi2soapui/demo`](openapi2soapui/demo) para ejemplos.

## Estructura del repositorio

```
<herramienta>/
├── README.md          # documentación de la herramienta y dependencias externas
├── skills.sh.json     # metadatos de agrupación para skills.sh
├── skills/<skill>/    # SKILL.md + scripts incluidos
└── demo/              # ejemplos de punta a punta (cuando existen)
```

## Licencia

Ver [LICENSE](LICENSE).
