# apiaddicts-skills

Agent skills to work with [apiaddicts](https://github.com/apiaddicts) tools. The skills don't replace the tools — they automate how to install, invoke and run them from any compatible agent (Claude Code, Cursor, Codex, OpenCode, and more).

Packaged to be installed with [`npx skills`](https://github.com/vercel-labs/skills).

## Installation

```bash
# All skills, for a specific agent
npx skills add apiaddicts/apiaddicts-skills --skill '*' -a claude-code

# Interactive (choose skills and agents)
npx skills add apiaddicts/apiaddicts-skills

# A single skill
npx skills add apiaddicts/apiaddicts-skills --skill generar-coleccion-postman

# From a local copy (to test before publishing)
npx skills add ./apiaddicts-skills
```

## Skills

### [ApiGen](apigen.net) — .NET hexagonal projects from OpenAPI

Automates [apiaddicts/apigen.net](https://github.com/apiaddicts/apigen.net).

| Skill | What it does |
|---|---|
| [`apigen-cli`](apigen.net/skills/apigen-cli) | Installs (if needed) and runs the `apigen` CLI to generate a .NET hexagonal project from an OpenAPI spec. |
| [`apigen-api`](apigen.net/skills/apigen-api) | Generates the project by calling the ApiGen REST API (`POST /generator/file`) instead of the local CLI. Requires `APIGEN_API_KEY`. |
| [`apigen-openapi-check`](apigen.net/skills/apigen-openapi-check) | Deterministically validates (Python script) that an OpenAPI spec has the `x-apigen-*` extensions the generator actually reads. |
| [`apigen-openapi-enrich`](apigen.net/skills/apigen-openapi-enrich) | Drafts and adds missing `x-apigen-*` extensions to a new or incomplete OpenAPI spec. |

Typical flow: `apigen-openapi-enrich` → `apigen-openapi-check` → `apigen-cli` or `apigen-api`.

### [openapi2postman](openapi2postman) — Postman contract tests from OpenAPI

Automates [apiaddicts/openapi2postman](https://github.com/apiaddicts/openapi2postman).

| Skill | What it does |
|---|---|
| [`instalar-openapi2postman`](openapi2postman/skills/instalar-openapi2postman) | Installs openapi2postman (`o2p`): global npm, local project/pipeline dependency, or from source. Node 16+ required. |
| [`generar-coleccion-postman`](openapi2postman/skills/generar-coleccion-postman) | Generates Postman contract tests (collection + environment) from an OpenAPI spec with `o2p`, including full config file, generated cases (2xx, 400, 401, 403, 404) and known spec limitations. |
| [`ejecutar-pruebas-postman`](openapi2postman/skills/ejecutar-pruebas-postman) | Runs the collection with Newman or Postman CLI, produces a report (cli, json, junit, html) and summarizes passed/failed tests. |

Typical flow: `instalar-openapi2postman` → `generar-coleccion-postman` → `ejecutar-pruebas-postman`. See [`openapi2postman/demo`](openapi2postman/demo) for end-to-end examples.

### [openapi2soapui](openapi2soapui) — SoapUI projects from OpenAPI

Automates [apiaddicts/openapi2soapui](https://github.com/apiaddicts/openapi2soapui).

| Skill | What it does |
|---|---|
| [`generar-proyecto-soapui`](openapi2soapui/skills/generar-proyecto-soapui) | Calls the openapi2soapui API to generate a SoapUI project XML from an OpenAPI spec (v2/v3), with the full request contract (parameters, defaults, validations). |
| [`ejecutar-proyecto-soapui`](openapi2soapui/skills/ejecutar-proyecto-soapui) | Installs/locates and runs SoapUI TestRunner CLI on a generated project (Java + Maven jar, official Docker image, or existing installation). |

Typical flow: `generar-proyecto-soapui` → `ejecutar-proyecto-soapui`. See [`openapi2soapui/demo`](openapi2soapui/demo) for examples.

## Repository layout

```
<tool>/
├── README.md          # tool-specific docs and external dependencies
├── skills.sh.json     # skills.sh grouping metadata
├── skills/<skill>/    # SKILL.md + bundled scripts
└── demo/              # end-to-end examples (when available)
```

## License

See [LICENSE](LICENSE).
