---
name: generar-coleccion-postman
description: Explains how to use openapi2postman (command `o2p`) to generate contract tests in Postman format (collection + environment) from an OpenAPI spec, including the full configuration file (environments, host, read_only, authentication, scopes, schema validation, examples), exactly which test cases it generates (2xx, 400, 401, 403, 404) and the verified spec limitations the tool does not support. Use it when the user asks to generate the Postman collection, create contract tests from an OpenAPI/Swagger spec, build or review the `o2p_config_file.json`, understand why tests are missing or why generation fails, or generate collections for several environments (DEV/PRE/PROD), even if they don't mention the exact tool name. Does NOT cover installing the tool (use `instalar-openapi2postman`) or running the collection with Postman/Newman.
---

# Generate Postman contract tests with openapi2postman

This skill covers how to invoke `o2p` on an OpenAPI spec and how to configure it. Everything below was verified against openapi2postman **2.4.3** (code in `master` = tag `2.4.3`), by running the tool and running the generated collections with Newman. The official documentation (README and PDFs in `docs/`, from 2020) is outdated on several points. In case of conflict, what this skill says takes precedence.

If the tool is not installed, use the `instalar-openapi2postman` skill first. Depending on how it was installed, the command is `o2p`, `node node_modules/openapi2postman/index.js` or `node index.js`. The examples use `o2p`.

## Step 0: gather the data, never assume it

Before generating, confirm with the user:

1. **Spec path.** It must be `.yaml` or `.yml` (see the pre-check).
2. **Environments** to generate (e.g. DEV, PRE, PROD) and, for each one, where the host comes from: a `servers[].url` in the spec (by pattern) or an explicit host.
3. **Whether any environment is production.** In that case `read_only: true` must be used, so that no POST/PUT/PATCH/DELETE are generated against real data.
4. **Authentication**: which `securitySchemes` the spec has and whether the user has their own Postman collection to obtain tokens.
5. **Output folder.**

Don't make up hosts, tokens or credentials.

## Step 1: spec pre-check (blockers)

Review the spec **before** running. These cases make generation fail or produce broken tests:

| Problem in the spec | What happens (verified) | Workaround |
|---|---|---|
| Spec in `.json` | Error `The yaml format is not correct` | Convert it to YAML (a copy) |
| `openapi: 3.0.4` or another version outside the list | Error `Specification is not supported` | Accepted versions: `2.0`, `3.0`–`3.0.3`, `3.1`–`3.1.2`, `3.2`/`3.2.0`. In a copy, downgrade to `3.0.3` |
| No `servers` (OAS3) | Error `servers is required` | Add `servers` with an absolute URL |
| Relative `servers[0].url` (`/v1`) | Error `servers.url should be http or https` | Use an absolute `http(s)://...` URL. Only `servers[0]` is validated |
| Swagger 2.0 without `host` or without `basePath` | Error `host is required` / `basePath is required` | Fill them in |
| `$ref` to a local file (`./common.yaml#/X`) | Error `$ref not found` | Only internal refs (`#/...`) and `http(s)://` URLs are resolved. Bundle the spec (e.g. `redocly bundle`) |
| Object without `properties` in a request body (plain `type: object`) | Error `There is an object without properties` | Define `properties`, or `additionalProperties: true` |
| Parameters declared at path level (`paths./x/{id}.parameters`) | **Silently ignored**: the URL keeps a literal `{id}` and the 404 case is not generated | Move them to each operation (in a copy) |
| Body property without `type` (only `oneOf`/`allOf`, etc.) | Omitted from the generated body | Declare `type` |

If you apply a workaround, do it **on a copy** of the spec and tell the user. Never modify the original spec without permission.

## Step 2: build the configuration file

Always use `-c`. Without configuration, the tool uses a default with `microcks_headers: true` (the README says `false`) and `host_server_pattern: "%dev%"`. If no server contains `dev`, the `host` variable is left empty and every request breaks.

### Recommended template

```json
{
  "api_name": "my_api",
  "is_inline": true,
  "schema_is_inline": true,
  "schema_pretty_print": true,
  "minimal_endpoints": false,
  "generate_oneOf_anyOf": false,
  "environments": [
    {
      "name": "DEV",
      "postman_collection_name": "%api_name%_DEV",
      "postman_environment_name": "%api_name%_DEV_env",
      "target_folder": "out",
      "host_server_pattern": "%dev%",
      "validate_schema": true,
      "read_only": false
    },
    {
      "name": "PROD",
      "postman_collection_name": "%api_name%_PROD",
      "postman_environment_name": "%api_name%_PROD_env",
      "target_folder": "out",
      "host": "https://api.mydomain.com",
      "port": "",
      "validate_schema": true,
      "read_only": true
    }
  ]
}
```

### Global fields

| Field | Default | Verified effect |
|---|---|---|
| `api_name` | spec name (only without `-c`) | Replaces `%api_name%` in names. **With `-c` and without this field, `%api_name%` stays literal in the file name** |
| `is_inline` | `false` | `false`: all values go as environment variables (`{{TC.001.001.id}}`) and **numbers and booleans in the body are sent as strings** (`"id": "1"`, `"vaccinated": "true"`). A strict server responds 400 in the happy path. `true`: values are written into the request with their real type (`"id": 5`). **`true` recommended** unless the user wants to edit the values from the environment |
| `schema_is_inline` | without `-c`: `false`. With `-c` and without the field: behaves as `true` | Only an explicit `false` stores each response's JSON Schema in an environment variable `TC.x.y.schemaTest`. Any other value writes it inside the test script |
| `schema_pretty_print` | without `-c`: `true`. With `-c` and without the field: compact | Only an explicit `true` indents the schema |
| `minimal_endpoints` | `false` | `true`: a single 400 case per body (instead of one per required field and another per field with a wrong type), and does not duplicate cases per optional query param |
| `generate_oneOf_anyOf` | `false` | `true`: if the request body is `oneOf`/`anyOf`, generates a set of cases (2xx and 400) for each option. With `false` it uses only the first one |
| `examples` | see below | Filler values when the spec has no `example` |

`examples` has two blocks, `successful` and `wrong`, with keys `string`, `number`, `boolean`, `date`, `date_time`, `object`, `array`. Without them, the filler values are `anystring`, `1`, `true`, `anydate` for the OK cases and `badstring`, `badnumber`, `badboolean`, `baddate` for the wrong ones. Careful: **`anydate` is not a valid date**, so a happy-path case with `date` fields will fail if there is no `example` in the spec or `examples.successful.date` in the config. Value priority: spec `example` (or `default` in query params) > config `examples` > filler.

For the wrong cases, the tool uses `maxLength + 1` for strings, `maximum + 1` or `minimum - 1` for numbers and month `50` for dates with an example. If there are no constraints, it uses the `wrong` value.

### Per-environment fields (`environments[]`)

| Field | Required | Verified effect |
|---|---|---|
| `name` | yes | Informational |
| `postman_collection_name` | yes | Name of the file and of the collection. If missing, the file is named `undefined.postman_collection.json`. (The official PDF mistakenly calls it `postman_connection_name`) |
| `postman_environment_name` | yes | Same, for the environment |
| `target_folder` | **yes** | Output folder, relative to the current folder. **If missing, it fails** with `Error writing the output: undefined` (the PDF says it uses the current folder; it does not). Only the last level is created: `a/b/c` fails if `a/b` does not exist |
| `host_server_pattern` | no | Finds the first `servers[].url` that contains the text (without the `%`) and uses its host and basePath. E.g. `"%pro%"` |
| `host` | no | Explicit host with protocol (`https://api.x.com`). Only used if there is no `host_server_pattern` or if the pattern found no server. If neither is present, `host` is left empty |
| `port` | no | Normalized to `:8080`. Empty if not specified |
| `read_only` | no (`false`) | `true`: keeps only GET and OPTIONS (also excludes HEAD) |
| `validate_schema` | no (`false`) | **With `false`, the AJV schema test is commented out** and the collection only validates status codes. For real contract testing, use `true`. Accepts boolean or `"true"`/`"false"` |
| `custom_authorizations_file` | no | Path (relative to the current folder) to a Postman collection with the requests that obtain tokens. It is inserted as a `000.authorizations` folder at the start |
| `has_scopes` | no | `true`: for each 2xx/3xx case with auth, adds variants with other tokens |
| `number_of_scopes` | no | With `has_scopes`, adds variants with tokens `<scheme>2`…`<scheme>N` |
| `application_token` | no | With `has_scopes`, adds a variant with `{{application_token}}` |
| `microcks_headers` | no | Adds the `X-Microcks-Response-Name` header to all requests: the name of the response's first `examples` entry, or `default` |
| `basepath` | — | **No longer exists** (it appears in the PDF). The basePath always comes from the spec |

## Step 3: run

Run from the folder that contains the config (see the `-c` constraint):

```bash
o2p -c o2p_config.json -f path/to/spec.yaml
```

Expected output per environment:
```
Collection out/my_api_DEV.postman_collection.json was succesfully created
Environment out/my_api_DEV_env.postman_environment.json was succesfully created
```

The yellow warnings `... without schema validation test because it has a different response than 'application/json'` are normal: they appear for each response without a JSON schema (even for statuses that are not generated later).

Path constraints:
- `-c` must be inside the current folder. Otherwise you get the misleading error `configuration file path does not exist or is not correct` (it also appears if the JSON is invalid). `O2P_ALLOWED_DIR` exists to allow another folder, but with that variable relative `-c` paths are resolved from it, so using an absolute path is best.
- `-f` does not have that constraint.

If there is an error, the process exits with code 1 and a red message.

## Which cases it generates (verified)

Tests are only generated for the **statuses declared in `responses`** of each operation:

| Status | Generated when | What it tests |
|---|---|---|
| **2xx** | Whenever declared | Valid request. If there are optional query params, also one case per param (`queryString <param>`), except with `minimal_endpoints` |
| **400** | `400` is declared | One case per omitted required query param (`without.<param>`), one per optional query param with a wrong value, and for the body: one case per omitted required property (`without.<field>`) and one per property with an invalid value (`with.<field>.wrong`) |
| **401** | `401` is declared **and** the operation has security | Sends `Authorization: {{not_authorized_token}}` |
| **403** | `403` is declared **and** the operation has security | Sends `Authorization: {{forbidden_token}}` |
| **404** | `404` is declared **and** the operation has a path param | Uses `{{<param>_not_found}}` in the URL |
| Others (3xx, 409, 422, 5xx, `default`, 1xx) | **Never** | — |

Each test checks the status code and, with `validate_schema: true` and an `application/json` response (or streaming types like `application/x-ndjson`), the schema with AJV. If the URL contains `$select` or `$exclude`, schema validation is disabled.

Collection structure: a folder per first path segment → a subfolder per operation (uses `summary` if present, otherwise `METHOD-path`), numbered `001.001.`. Tests are named `TC.001.001.200 Successfull` and, if they share a status, get letters (`400a`, `400b`...). Order: POST, PUT, PATCH, GET, DELETE.

Request bodies: `application/json` takes priority. If not present, it uses `x-www-form-urlencoded` (urlencoded mode) or `multipart/form-data` (formdata mode). **In multipart, all fields are marked as `file` and empty**, even strings.

## Authentication (verified)

- The tool takes the **first** scheme from the operation's `security` or, if it has none, the global one. It always sends it as an `Authorization: {{<scheme_name>}}` header, **regardless of the type**. An `apiKey` with `in: header, name: X-API-Key` is still sent as `Authorization`.
- **`security: []` on an operation does not make it public**: it inherits the global security.
- `oauth2` scheme with `tokenUrl` and without `custom_authorizations_file`: a `Get OAuth2 Token - <scheme>` request is added that POSTs to `tokenUrl` with `grant_type=password` and username and password `cambiame`, **whatever flow is declared**. It stores `Bearer <access_token>` in the scheme variable. It must be adjusted manually.
- With `custom_authorizations_file`: that collection replaces the autogenerated request. Its requests must store the token in an environment variable with the **same name as the scheme** (e.g. `pm.environment.set("oauth", "Bearer " + token)`).
- Without `components.securitySchemes` (OAS3) and without an auth file: the Authorization headers and the 401/403 cases are removed.

## After generating: what the user has to fill in

In the generated environment, tell them to review:
- Empty token variables: `<scheme>`, `not_authorized_token`, `forbidden_token` (and `<scheme>2..N` / `application_token` if scopes were used).
- Empty `host`, if there was no `host` and no matching pattern.
- Filler values (`anystring`, `anydate`, `1`) that the real backend will reject. Path param IDs must exist in the backend for the 2xx cases.
- `cambiame` credentials in the autogenerated OAuth2 request.

Note: all generated collections share the same `_postman_id` (and all environments the same `id`). When importing several into the Postman app, it may ask to replace one with another.

## Out of scope

This skill does not cover:
- Installing the tool (see the `instalar-openapi2postman` skill)
- Running the collection (Postman, Newman, pipelines) or interpreting its results
- Fixing the OpenAPI spec beyond the minimal workarounds listed
