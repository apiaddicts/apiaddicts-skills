# Demo 01: collection generation

Generates Postman contract tests from `httpbin.yaml` with openapi2postman (skill `generar-coleccion-postman`).

## Requirements

openapi2postman installed (skill `instalar-openapi2postman`), for example `npm install -g openapi2postman`.

## Files

- `httpbin.yaml`: OpenAPI 3.0.3 with `GET /bearer` (security `bearerAuth`) and `POST /post` (body `Mascota`).
- `o2p_config.json`: a `DEMO` environment with:
  - `host_server_pattern: "%httpbin%"`: takes the host from `servers`.
  - `is_inline: true`: numbers and booleans are sent with their real type.
  - `validate_schema: true`: enables AJV validation of the responses.

## Run

From this folder (the `-c` file must be inside the current folder):

```bash
o2p -c o2p_config.json -f httpbin.yaml
```

Expected output:

```
Test: GET /bearer-401 (main test) without schema validation test because it has a different response than 'application/json'
Test: POST /post-400 (main test) without schema validation test because it has a different response than 'application/json'
Collection out/httpbin_DEMO.postman_collection.json was succesfully created
Environment out/httpbin_DEMO_env.postman_environment.json was succesfully created
```

The two warnings are normal: the 401 and 400 responses have no JSON response schema.

## Result (`out/`)

8 test cases:

```
001.bearer
  001.001.Comprobar token Bearer
    TC.001.001.200 Successfull              Authorization: {{bearerAuth}}
    TC.001.001.401 Unauthorized             Authorization: {{not_authorized_token}}
002.post
  002.001.Enviar mascota
    TC.002.001.200 Successfull              {"name":"Firulais","age":3,"vaccinated":true}
    TC.002.001.400a Error without.name      {"age":3,"vaccinated":true}
    TC.002.001.400b Error without.age       {"name":"Firulais","vaccinated":true}
    TC.002.001.400c Error with.name.wrong   {"name":"Firulaiszzzzzzzzzzzzz",...}   (maxLength 20 + 1)
    TC.002.001.400d Error with.age.wrong    {"name":"Firulais","age":31,...}        (maximum 30 + 1)
    TC.002.001.400e Error with.vaccinated.wrong  {...,"vaccinated":"badboolean"}
```

Generated environment: `host = https://httpbin.org`, `bearerAuth = ""`, `not_authorized_token = ""`. **`bearerAuth` must be filled in before running** (demos 02 and 03 pass it with `--env-var`).
