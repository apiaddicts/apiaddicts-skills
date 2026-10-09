---
name: generar-proyecto-soapui
description: Teaches how to call this repo's own API (openapi2soapui) to generate a SoapUI project in XML from an OpenAPI spec, including the full request contract (parameters, defaults, validations). Use it when the user asks to generate the SoapUI project/collection with the API, call the openapi2soapui endpoint, create the collection via the API, or needs to know which parameters/configuration the generation accepts (oAuth2Profiles, headers, customAuthorizationsFile, testCaseNames, flags such as readOnly/hasScopes/validateSchema, etc.), even if they don't mention the exact endpoint name. It does NOT cover running the generated tests with SoapUI TestRunner or starting the service with Docker — do not use this skill for that.
---

# Generate a SoapUI project via the openapi2soapui API

This skill covers **only** how to call this repo's endpoint that generates a SoapUI project from an OpenAPI spec, and what configuration it accepts. It does not cover running the generated project (SoapUI TestRunner) or starting the service (Docker/Maven) — if the user asks for that, it is separate work.

## Step 0 — get the base URL (mandatory)

The service base URL (host:port, e.g. `http://localhost:8080`) is **never assumed**. If it has not already been confirmed in the current conversation, ask the user for it before building any request. Do not default to `localhost:8080` without the user confirming it — it may be running on a different port, in Docker with a different mapping, or on a remote host.

The endpoint basepath, however, is fixed (it comes from `application.properties`): `/api-openapi-to-soapui/v1`.

## Build the request

1. **Encode the OpenAPI spec to base64.**

   Bash:
   ```bash
   SPEC_B64=$(base64 -w0 spec.yaml)
   ```

   PowerShell:
   ```powershell
   $SpecB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("spec.yaml"))
   ```

2. **Assemble the JSON body.** Minimum viable:
   ```json
   {
     "apiName": "MyApi",
     "openApiSpec": "<base64>",
     "headers": []
   }
   ```
   See the full parameter table below to add optional configuration.

3. **Call the endpoint:**
   ```
   POST {baseUrl}/api-openapi-to-soapui/v1/soap-ui-projects
   Content-Type: application/json
   ```
   The response (`produces: application/xml`) is the **raw SoapUI project XML** — it is not wrapped in JSON. Save the response body directly to a `.xml` file.

   Bash example:
   ```bash
   curl -s -X POST "$BASE_URL/api-openapi-to-soapui/v1/soap-ui-projects" \
     -H "Content-Type: application/json" \
     --data @request.json \
     -o soapui-project.xml \
     -w "HTTP %{http_code}\n"
   ```

## Full parameter reference (`SoapUIProjectRequest`)

Only `apiName` and `openApiSpec` are required. Everything else is optional.

| Parameter | Type | Default | Effect |
|---|---|---|---|
| `apiName` | String | — (required) | Base name of the generated project/service |
| `openApiSpec` | String (base64) | — (required) | Content of the OpenAPI v2 or v3 spec, base64-encoded |
| `oAuth2Profiles` | List of OAuth2Profile | — | OAuth2 authentication profiles to add to the project (see section below) |
| `testCaseNames` | Set of String | none | Names of additional custom test cases; each name must be non-empty |
| `headers` | List of `{key,value}` | none | Headers applied to all generated resources |
| `customAuthorizationsFile` | List of CustomAuthorizationRequest | — | Auth bootstrap requests run before the tests (see section below) |
| `readOnly` | Boolean | `false` | Only generates test cases for GET/OPTIONS methods |
| `serverPattern` | String (e.g. `"%dev%"`) | first server in the spec | Filters which `server` from the spec to use, by substring wrapped in `%`; if it doesn't match or is omitted, the first declared one is used |
| `minimalEndpoints` | Boolean | `false` | Collapses `CaseErrorRequired{Field}` generation to at most one per operation instead of one per required field |
| `microcksHeaders` | Boolean | `false` | Adds the `X-Microcks-Response-Name` header; if the user already sends a custom header with that same name, the user's header is preserved |
| `generateOneOfAnyOf` | Boolean | `false` | Resolves `oneOf`/`anyOf` to the first candidate when generating examples. `allOf` is always merged, regardless of this flag |
| `validateSchema` | Boolean | `true` | Adds the Script Assertion that validates the response JSON Schema. The status code assertion is always added, regardless of this flag |
| `schemaIsInline` | Boolean | `false` | `false` = schema as a SoapUI Project Property referenced via `context.expand`; `true` = literal schema embedded in the script |
| `schemaPrettyPrint` | Boolean | `true` | Indented schema (`true`) vs compact (`false`) |
| `isInline` | Boolean | `false` | Controls whether the **body** example values go as a Project Property or literal. **Query param values are always literal**, regardless of this flag |
| `hasScopes` | Boolean | `false` | Generates extra `OkScope{profileName}` test cases per OAuth2 profile. Has no effect if `oAuth2Profiles` has 0 or 1 entries |
| `applicationToken` | Boolean | `false` | Only relevant if `hasScopes=true`; generates `OkApplicationToken{profileName}` cases for profiles with `grantType=CLIENT_CREDENTIALS` |
| `numberOfScopes` | Integer | `1` | Only relevant if `hasScopes=true`; values lower than 1 are treated as 1 |
| `examples` | ExamplesConfig | — | Example value overrides (see section below) |

### `examples` (ExamplesConfig)

```json
{
  "examples": {
    "successful": { "string": "...", "number": 1, "boolean": true, "date": "2020-01-01", "dateTime": "2020-01-01T23:59:59", "array": "[1,2,3]", "object": "{\"id\":1}" },
    "wrong": { "string": "...", "number": -1, "boolean": false, "date": "invalid", "dateTime": "invalid", "array": "[]", "object": "{}" }
  }
}
```
- `successful` overrides the values used in the positive cases (`CaseOkAllProperties`/`CaseOkRequiredProperties`).
- `wrong` overrides the values used in the negative `CaseErrorRequired{Field}` cases, instead of omitting/emptying the field.
- Both only replace leaf scalar values (string/number/boolean/date/dateTime/array/object) — they don't affect how `oneOf`/`anyOf`/`allOf` are resolved.
- In query params, if the format is recognized (e.g. `email`), the tool generates a realistic sample that takes precedence over the configured `"string"`.

## OAuth2Profiles in detail

Two ways to define a profile:

**I already have the token:**
```json
{ "profileName": "prod", "accessToken": "abc123..." }
```

**I need the token to be obtained** (add `grantType` and the fields that grant type requires):
```json
{
  "profileName": "dev",
  "grantType": "AUTHORIZATION_CODE",
  "clientId": "...",
  "clientSecret": "...",
  "scope": "openid, secret",
  "accessTokenPosition": "HEADER",
  "accessTokenURI": "https://api.example.com/token",
  "authorizationURI": "https://api.example.com/auth",
  "redirectURI": "https://api.example.com/callback"
}
```

`profileName` is always required. The other fields are conditionally required depending on `grantType` — if one is missing, error 1208 indicates which:

| `grantType` | Fields that become mandatory |
|---|---|
| `AUTHORIZATION_CODE` | `clientId`, `clientSecret`, `accessTokenURI`, `authorizationURI`, `redirectURI`, `accessTokenPosition` |
| `CLIENT_CREDENTIALS` | `clientId`, `clientSecret`, `accessTokenURI`, `accessTokenPosition` |
| `RESOURCE_OWNER_PASSWORD_CREDENTIALS` | `clientId`, `clientSecret`, `username`, `password`, `accessTokenURI`, `accessTokenPosition` |
| `IMPLICIT` | `clientId`, `authorizationURI`, `redirectURI`, `accessTokenPosition` |

`accessTokenPosition` is one of: `HEADER`, `BODY`, `QUERY`.

## customAuthorizationsFile in detail

Each entry defines an authentication bootstrap request (e.g. a token fetch) that runs before the regular tests:

```json
{
  "name": "GetToken",
  "method": "POST",
  "endpoint": "https://api.example.com/security/token",
  "mediaType": "application/x-www-form-urlencoded",
  "body": "grant_type=client_credentials&client_id={{client_id}}&client_secret={{client_secret}}",
  "headers": []
}
```

- `name`, `method`, `endpoint` are required. `method` is case-insensitive but must match `GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS`.
- `headers`, `mediaType`, `body` are optional.
- Generates a **separate TestSuite** named `authorizations_{apiName}_{apiVersion}-Suite`, placed before the regular per-endpoint test suites, with one `{method}_Case{name}` TestCase per entry.

## Quickly diagnosing a 400

| Code | Cause |
|---|---|
| 1001 | `apiName` empty or missing |
| 1002 | `openApiSpec` empty or missing |
| 1100 | The `openApiSpec` content is not valid YAML/JSON after base64 decoding |
| 1101 | The content does not conform to the OpenAPI v2/v3 structure |
| 1102 | `info.version` was not found in the spec |
| 1208 | `oAuth2Profiles` — a conditionally required field for the `grantType` is missing (the message indicates which) |
| 1301 / 1302 | `headers.key` or `headers.value` empty |
| 1401 | `testCaseNames` has an empty item |
| 1501 / 1502 / 1503 | `customAuthorizationsFile` — `name`/`method`/`endpoint` missing |
| 1504 | `customAuthorizationsFile.method` does not match the allowed HTTP verbs |

## Note on the service's own published spec

The service's own `api.yaml` (`src/main/resources/static/api.yaml`) has a known typo in the `oneOf` discriminator of `OAuth2ProfileToGetToken`: the mapping between `IMPLICIT` and `RESOURCE_OWNER_PASSWORD_CREDENTIALS` is swapped. It doesn't affect the actual validation (which runs in Java via `AuthenticationConditionalValidator`), it's just noise in that documentation — don't get confused if you compare against that YAML.

## Out of scope

This skill does not cover:
- Running the generated project with SoapUI TestRunner
- Starting the service (Docker Compose / Maven)
- Modifying the XML of an already generated project
