# openapi2soapui skills

Estas skills automatizan el uso de [openapi2soapui](https://github.com/apiaddicts/openapi2soapui): llamar su API para generar un proyecto SoapUI a partir de un spec OpenAPI, y luego instalar/ejecutar el TestRunner de SoapUI para correr ese proyecto desde línea de comandos o pipeline. No reemplazan la herramienta — automatizan cómo invocarla.

Empaquetadas para instalarse con `npx skills`, funcionan en cualquier agente compatible (Claude Code, Cursor, Codex, OpenCode, y más). Ver [vercel-labs/skills](https://github.com/vercel-labs/skills).

## Instalación

```bash
# Instalar todas las skills, para un agente específico
npx skills add apiaddicts/openapi2soapui-skills --skill '*' -a claude-code

# Instalación interactiva (elegir skills)
npx skills add apiaddicts/openapi2soapui-skills

# Desde una copia local (para probar antes de publicar)
npx skills add ./openapi2soapui-skills
```

## Skills incluidas

| Skill | Qué hace |
|---|---|
| [`generar-proyecto-soapui`](skills/generar-proyecto-soapui) | Llama la API de openapi2soapui (`POST /soap-ui-projects`) para generar el XML de un proyecto SoapUI a partir de un spec OpenAPI (v2/v3), incluyendo el contrato completo del request: parámetros, defaults y validaciones. |
| [`ejecutar-proyecto-soapui`](skills/ejecutar-proyecto-soapui) | Instala/localiza y ejecuta el SoapUI TestRunner CLI para correr un proyecto SoapUI ya generado, sin necesitar la app de escritorio completa (Java+jar de Maven, Docker oficial, o localizar una instalación existente). |

Flujo típico: generar el proyecto vía API con `generar-proyecto-soapui` → ejecutar el `.xml` resultante con `ejecutar-proyecto-soapui`.

## Dependencias externas por skill

- `generar-proyecto-soapui`: el servicio openapi2soapui corriendo y accesible (la skill pregunta la URL base, nunca la asume).
- `ejecutar-proyecto-soapui`: uno de los siguientes, según el entorno del usuario — JDK + Maven (para resolver el jar de SoapUI Core), Docker (para la imagen oficial `smartbear/soapuios-testrunner`), o una instalación existente de SoapUI de escritorio.

## Origen

Automatiza el uso de [apiaddicts/openapi2soapui](https://github.com/apiaddicts/openapi2soapui), la herramienta que convierte specs OpenAPI en proyectos SoapUI. Estas skills no la reemplazan — documentan y automatizan cómo llamarla y cómo ejecutar lo que genera.
