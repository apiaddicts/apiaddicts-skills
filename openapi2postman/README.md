# openapi2postman skills

These skills automate the use of [openapi2postman](https://github.com/apiaddicts/openapi2postman) to create contract tests: generate Postman collections from an OpenAPI spec and run them from the command line or a pipeline. They do not replace the tool — they automate how to invoke it.

Packaged to be installed with `npx skills`, they work in any compatible agent (Claude Code, Cursor, Codex, OpenCode, and more). See [vercel-labs/skills](https://github.com/vercel-labs/skills).

## Installation

```bash
# Install all skills, for a specific agent
npx skills add apiaddicts/openapi2postman-skills --skill '*' -a claude-code

# Interactive installation (choose skills)
npx skills add apiaddicts/openapi2postman-skills

# From a local copy (to test before publishing)
npx skills add ./openapi2postman-skills
```

## Included skills

| Skill | What it does |
|---|---|
| [`instalar-openapi2postman`](skills/instalar-openapi2postman) | Installs the openapi2postman tool (`o2p`): globally with npm, as a local project/pipeline dependency, or from source. Includes the actual requirements (Node 16+), verification and known limitations (e.g. `npx` does not work). |
| [`generar-coleccion-postman`](skills/generar-coleccion-postman) | Generates contract tests in Postman format (collection + environment) from an OpenAPI spec with `o2p`: full configuration file, generated cases (2xx, 400, 401, 403, 404), authentication and verified spec limitations. |
| [`ejecutar-pruebas-postman`](skills/ejecutar-pruebas-postman) | Runs the collection with Newman or Postman CLI: checks whether the tool is installed (if not, asks permission to install it globally or temporarily with `npx`), asks for the report format (cli, json, junit, html) and output folder, and summarizes passed/failed tests with their reasons. |

Typical flow: install the tool with `instalar-openapi2postman` → generate the collection with `generar-coleccion-postman` → run it with `ejecutar-pruebas-postman`.

## Demos

The [`demo/`](demo) folder has end-to-end cases against [httpbin.org](https://httpbin.org): collection generation, a run with Newman and a run with Postman CLI, with their reports.

## External dependencies per skill

- `instalar-openapi2postman`: Node.js 16+ and npm. `git` only if installing from source.
- `ejecutar-pruebas-postman`: Node.js + npm, and Newman or Postman CLI (the skill offers to install them). Network access to the API host.
- `generar-coleccion-postman`: openapi2postman installed and an OpenAPI spec in YAML (2.0, 3.0–3.0.3, 3.1–3.1.2 or 3.2).

## Origin

Automates the use of [apiaddicts/openapi2postman](https://github.com/apiaddicts/openapi2postman), the tool that converts OpenAPI specs into Postman collections with contract tests. These skills do not replace it — they document and automate how to call it and how to run what it generates.
