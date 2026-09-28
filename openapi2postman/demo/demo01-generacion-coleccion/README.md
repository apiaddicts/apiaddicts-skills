# Demo 01: generación de la colección

Genera contract tests Postman desde `httpbin.yaml` con openapi2postman (skill `generar-coleccion-postman`).

## Requisitos

openapi2postman instalado (skill `instalar-openapi2postman`), por ejemplo `npm install -g openapi2postman`.

## Archivos

- `httpbin.yaml`: OpenAPI 3.0.3 con `GET /bearer` (security `bearerAuth`) y `POST /post` (body `Mascota`).
- `o2p_config.json`: un entorno `DEMO` con:
  - `host_server_pattern: "%httpbin%"`: toma el host de `servers`.
  - `is_inline: true`: números y booleanos viajan con su tipo real.
  - `validate_schema: true`: activa la validación AJV de las respuestas.

## Ejecutar

Desde esta carpeta (el `-c` tiene que estar dentro de la carpeta actual):

```bash
o2p -c o2p_config.json -f httpbin.yaml
```

Salida esperada:

```
Test: GET /bearer-401 (main test) without schema validation test because it has a different response than 'application/json'
Test: POST /post-400 (main test) without schema validation test because it has a different response than 'application/json'
Collection out/httpbin_DEMO.postman_collection.json was succesfully created
Environment out/httpbin_DEMO_env.postman_environment.json was succesfully created
```

Los dos warnings son normales: los 401 y 400 no tienen schema de respuesta JSON.

## Resultado (`out/`)

8 casos de prueba:

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

Entorno generado: `host = https://httpbin.org`, `bearerAuth = ""`, `not_authorized_token = ""`. **`bearerAuth` hay que completarlo antes de ejecutar** (las demos 02 y 03 lo pasan con `--env-var`).
