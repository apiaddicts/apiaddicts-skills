# openapi2soapui skills

These skills automate the use of [openapi2soapui](https://github.com/apiaddicts/openapi2soapui): calling its API to generate a SoapUI project from an OpenAPI spec, and then installing/running the SoapUI TestRunner to run that project from the command line or a pipeline. They do not replace the tool — they automate how to invoke it.

Packaged to be installed with `npx skills`, they work with any compatible agent (Claude Code, Cursor, Codex, OpenCode, and more). See [vercel-labs/skills](https://github.com/vercel-labs/skills).

## Installation

```bash
# Install all skills, for a specific agent
npx skills add apiaddicts/openapi2soapui-skills --skill '*' -a claude-code

# Interactive installation (choose skills)
npx skills add apiaddicts/openapi2soapui-skills

# From a local copy (to test before publishing)
npx skills add ./openapi2soapui-skills
```

## Included skills

| Skill | What it does |
|---|---|
| [`generar-proyecto-soapui`](skills/generar-proyecto-soapui) | Calls the openapi2soapui API (`POST /soap-ui-projects`) to generate the XML of a SoapUI project from an OpenAPI spec (v2/v3), including the full request contract: parameters, defaults and validations. |
| [`ejecutar-proyecto-soapui`](skills/ejecutar-proyecto-soapui) | Installs/locates and runs the SoapUI TestRunner CLI to run an already generated SoapUI project, without needing the full desktop app (Java + Maven jar, official Docker image, or locating an existing installation). |

Typical flow: generate the project via the API with `generar-proyecto-soapui` → run the resulting `.xml` with `ejecutar-proyecto-soapui`.

## External dependencies per skill

- `generar-proyecto-soapui`: the openapi2soapui service running and reachable (the skill asks for the base URL, it never assumes it).
- `ejecutar-proyecto-soapui`: one of the following, depending on the user's environment — JDK + Maven (to resolve the SoapUI Core jar), Docker (for the official `smartbear/soapuios-testrunner` image), or an existing SoapUI desktop installation.

## Origin

Automates the use of [apiaddicts/openapi2soapui](https://github.com/apiaddicts/openapi2soapui), the tool that converts OpenAPI specs into SoapUI projects. These skills do not replace it — they document and automate how to call it and how to run what it generates.
