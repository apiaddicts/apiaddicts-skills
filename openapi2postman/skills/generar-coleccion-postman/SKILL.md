---
name: generar-coleccion-postman
description: Enseña cómo usar openapi2postman (comando `o2p`) para generar contract tests en formato Postman (colección + entorno) a partir de un spec OpenAPI, incluyendo el archivo de configuración completo (entornos, host, read_only, autenticación, scopes, validación de esquema, ejemplos), qué casos de prueba genera exactamente (2xx, 400, 401, 403, 404) y las limitaciones verificadas del spec que la herramienta no soporta. Úsala cuando el usuario pida generar la colección Postman, crear contract tests desde un OpenAPI/Swagger, armar o revisar el `o2p_config_file.json`, entender por qué faltan tests o por qué falla la generación, o generar colecciones para varios entornos (DEV/PRE/PROD), incluso si no menciona el nombre exacto de la herramienta. NO cubre instalar la herramienta (usa `instalar-openapi2postman`) ni ejecutar la colección con Postman/Newman.
---

# Generar contract tests Postman con openapi2postman

Esta skill cubre cómo invocar `o2p` sobre un spec OpenAPI y cómo configurarlo. Todo lo que dice abajo fue verificado contra openapi2postman **2.4.3** (código en `master` = tag `2.4.3`), ejecutando la herramienta y corriendo las colecciones generadas con Newman. La documentación oficial (README y PDFs de `docs/`, de 2020) está desactualizada en varios puntos. Si hay conflicto, manda lo que dice esta skill.

Si la herramienta no está instalada, usá primero la skill `instalar-openapi2postman`. Según cómo se instaló, el comando es `o2p`, `node node_modules/openapi2postman/index.js` o `node index.js`. En los ejemplos se usa `o2p`.

## Paso 0: reunir datos, nunca asumirlos

Antes de generar, confirmá con el usuario:

1. **Ruta del spec.** Tiene que ser `.yaml` o `.yml` (ver el pre-chequeo).
2. **Entornos** a generar (ej. DEV, PRE, PROD) y, para cada uno, de dónde sale el host: de un `servers[].url` del spec (por patrón) o de un host explícito.
3. **Si algún entorno es productivo.** En ese caso hay que usar `read_only: true`, para que no se generen POST/PUT/PATCH/DELETE contra datos reales.
4. **Autenticación**: qué `securitySchemes` tiene el spec y si el usuario tiene una colección Postman propia para obtener tokens.
5. **Carpeta de salida.**

No inventes hosts, tokens ni credenciales.

## Paso 1: pre-chequeo del spec (bloqueantes)

Revisá el spec **antes** de ejecutar. Estos casos hacen fallar la generación o producen tests rotos:

| Problema en el spec | Qué pasa (verificado) | Workaround |
|---|---|---|
| Spec en `.json` | Error `The yaml format is not correct` | Convertirlo a YAML (una copia) |
| `openapi: 3.0.4` u otra versión fuera de la lista | Error `Specification is not supported` | Versiones aceptadas: `2.0`, `3.0`–`3.0.3`, `3.1`–`3.1.2`, `3.2`/`3.2.0`. En una copia, bajar a `3.0.3` |
| Sin `servers` (OAS3) | Error `servers is required` | Agregar `servers` con URL absoluta |
| `servers[0].url` relativa (`/v1`) | Error `servers.url should be http or https` | Usar una URL absoluta `http(s)://...`. Solo se valida `servers[0]` |
| Swagger 2.0 sin `host` o sin `basePath` | Error `host is required` / `basePath is required` | Completarlos |
| `$ref` a archivo local (`./common.yaml#/X`) | Error `$ref not found` | Solo se resuelven refs internos (`#/...`) y URLs `http(s)://`. Hacer bundle del spec (ej. `redocly bundle`) |
| Objeto sin `properties` en un body de request (`type: object` a secas) | Error `There is an object without properties` | Definir `properties`, o `additionalProperties: true` |
| Parámetros declarados a nivel de path (`paths./x/{id}.parameters`) | **Se ignoran** sin avisar: la URL queda con `{id}` literal y no se genera el caso 404 | Moverlos a cada operación (en una copia) |
| Propiedad de body sin `type` (solo `oneOf`/`allOf`, etc.) | Se omite del body generado | Declarar `type` |

Si aplicás un workaround, hacelo **sobre una copia** del spec y avisale al usuario. Nunca modifiques el spec original sin permiso.

## Paso 2: armar el archivo de configuración

Usá siempre `-c`. Sin configuración, la herramienta usa un default con `microcks_headers: true` (el README dice `false`) y `host_server_pattern: "%dev%"`. Si ningún server contiene `dev`, la variable `host` queda vacía y todas las requests se rompen.

### Plantilla recomendada

```json
{
  "api_name": "mi_api",
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
      "host": "https://api.midominio.com",
      "port": "",
      "validate_schema": true,
      "read_only": true
    }
  ]
}
```

### Campos globales

| Campo | Default | Efecto verificado |
|---|---|---|
| `api_name` | nombre del spec (solo sin `-c`) | Reemplaza `%api_name%` en los nombres. **Con `-c` y sin este campo, el `%api_name%` queda literal en el nombre del archivo** |
| `is_inline` | `false` | `false`: todos los valores van como variables de entorno (`{{TC.001.001.id}}`) y **números y booleanos del body se envían como string** (`"id": "1"`, `"vaccinated": "true"`). Un servidor estricto responde 400 en el caso feliz. `true`: los valores se escriben en la request con su tipo real (`"id": 5`). **Recomendado `true`** salvo que el usuario quiera editar los valores desde el entorno |
| `schema_is_inline` | sin `-c`: `false`. Con `-c` y sin el campo: se comporta como `true` | Solo `false` explícito guarda el JSON Schema de cada respuesta en una variable de entorno `TC.x.y.schemaTest`. Cualquier otro valor lo escribe dentro del script de test |
| `schema_pretty_print` | sin `-c`: `true`. Con `-c` y sin el campo: compacto | Solo `true` explícito indenta el schema |
| `minimal_endpoints` | `false` | `true`: un solo caso 400 por body (en vez de uno por campo requerido y otro por campo con tipo erróneo), y no duplica casos por query param opcional |
| `generate_oneOf_anyOf` | `false` | `true`: si el body de request es `oneOf`/`anyOf`, genera un juego de casos (2xx y 400) por cada opción. Con `false` usa solo la primera |
| `examples` | ver abajo | Valores de relleno cuando el spec no trae `example` |

`examples` tiene dos bloques, `successful` y `wrong`, con claves `string`, `number`, `boolean`, `date`, `date_time`, `object`, `array`. Sin ellos, los valores de relleno son `anystring`, `1`, `true`, `anydate` para los casos OK y `badstring`, `badnumber`, `badboolean`, `baddate` para los erróneos. Ojo: **`anydate` no es una fecha válida**, así que un caso feliz con campos `date` va a fallar si no hay `example` en el spec o `examples.successful.date` en la config. Prioridad de valores: `example` del spec (o `default` en query params) > `examples` de la config > relleno.

Para los casos erróneos, la herramienta usa `maxLength + 1` en strings, `maximum + 1` o `minimum - 1` en números y mes `50` en fechas con example. Si no hay restricciones, usa el valor `wrong`.

### Campos por entorno (`environments[]`)

| Campo | Obligatorio | Efecto verificado |
|---|---|---|
| `name` | sí | Informativo |
| `postman_collection_name` | sí | Nombre del archivo y de la colección. Si falta, el archivo se llama `undefined.postman_collection.json`. (El PDF oficial lo llama `postman_connection_name` por error) |
| `postman_environment_name` | sí | Ídem, para el entorno |
| `target_folder` | **sí** | Carpeta de salida, relativa a la carpeta actual. **Si falta, falla** con `Error writing the output: undefined` (el PDF dice que usa la carpeta actual; no es así). Solo crea el último nivel: `a/b/c` falla si `a/b` no existe |
| `host_server_pattern` | no | Busca el primer `servers[].url` que contenga el texto (sin los `%`) y usa su host y basePath. Ej. `"%pro%"` |
| `host` | no | Host explícito con protocolo (`https://api.x.com`). Solo se usa si no hay `host_server_pattern` o si el patrón no encontró server. Si no hay ninguno de los dos, `host` queda vacío |
| `port` | no | Se normaliza a `:8080`. Vacío si no se indica |
| `read_only` | no (`false`) | `true`: deja solo GET y OPTIONS (también excluye HEAD) |
| `validate_schema` | no (`false`) | **Con `false`, el test de schema AJV queda comentado** y la colección solo valida status codes. Para contract testing real, usar `true`. Acepta boolean o `"true"`/`"false"` |
| `custom_authorizations_file` | no | Ruta (relativa a la carpeta actual) a una colección Postman con las requests que obtienen tokens. Se inserta como carpeta `000.authorizations` al inicio |
| `has_scopes` | no | `true`: por cada caso 2xx/3xx con auth, agrega variantes con otros tokens |
| `number_of_scopes` | no | Con `has_scopes`, agrega variantes con tokens `<scheme>2`…`<scheme>N` |
| `application_token` | no | Con `has_scopes`, agrega una variante con `{{application_token}}` |
| `microcks_headers` | no | Agrega el header `X-Microcks-Response-Name` a todas las requests: el nombre del primer `examples` de la respuesta, o `default` |
| `basepath` | — | **Ya no existe** (aparece en el PDF). El basePath sale siempre del spec |

## Paso 3: ejecutar

Ejecutá desde la carpeta que contiene la config (ver restricción de `-c`):

```bash
o2p -c o2p_config.json -f ruta/al/spec.yaml
```

Salida esperada por entorno:
```
Collection out/mi_api_DEV.postman_collection.json was succesfully created
Environment out/mi_api_DEV_env.postman_environment.json was succesfully created
```

Los warnings amarillos `... without schema validation test because it has a different response than 'application/json'` son normales: aparecen por cada respuesta sin schema JSON (incluso para status que después no se generan).

Restricciones de rutas:
- `-c` tiene que estar dentro de la carpeta actual. Si no, sale el error engañoso `configuration file path does not exist or is not correct` (también sale si el JSON es inválido). Para permitir otra carpeta existe `O2P_ALLOWED_DIR`, pero con esa variable las rutas relativas de `-c` se resuelven desde ella, así que conviene usar una ruta absoluta.
- `-f` no tiene esa restricción.

Si hay error, el proceso termina con código 1 y un mensaje en rojo.

## Qué casos genera (verificado)

Solo se generan tests para los **status declarados en `responses`** de cada operación:

| Status | Se genera cuando | Qué prueba |
|---|---|---|
| **2xx** | Siempre que esté declarado | Request válida. Si hay query params opcionales, además un caso por cada uno (`queryString <param>`), salvo con `minimal_endpoints` |
| **400** | Hay `400` declarado | Un caso por cada query param requerido omitido (`without.<param>`), uno por cada query param opcional con valor erróneo, y por el body: un caso por cada propiedad requerida omitida (`without.<campo>`) y uno por cada propiedad con valor inválido (`with.<campo>.wrong`) |
| **401** | Hay `401` declarado **y** la operación tiene seguridad | Envía `Authorization: {{not_authorized_token}}` |
| **403** | Hay `403` declarado **y** la operación tiene seguridad | Envía `Authorization: {{forbidden_token}}` |
| **404** | Hay `404` declarado **y** la operación tiene path param | Usa `{{<param>_not_found}}` en la URL |
| Otros (3xx, 409, 422, 5xx, `default`, 1xx) | **Nunca** | — |

Cada test verifica el status code y, con `validate_schema: true` y una respuesta `application/json` (o tipos streaming como `application/x-ndjson`), el schema con AJV. Si la URL lleva `$select` o `$exclude`, la validación de schema se desactiva.

Estructura de la colección: carpeta por primer segmento del path → subcarpeta por operación (usa `summary` si existe, si no `MÉTODO-path`), numeradas `001.001.`. Los tests se llaman `TC.001.001.200 Successfull` y, si comparten status, llevan letras (`400a`, `400b`...). Orden: POST, PUT, PATCH, GET, DELETE.

Bodies de request: prioriza `application/json`. Si no hay, usa `x-www-form-urlencoded` (modo urlencoded) o `multipart/form-data` (modo formdata). **En multipart, todos los campos se marcan como `file` y vacíos**, incluso los string.

## Autenticación (verificado)

- La herramienta toma el **primer** scheme de `security` de la operación o, si no tiene, el global. Siempre lo envía como header `Authorization: {{<nombre_del_scheme>}}`, **sin importar el tipo**. Un `apiKey` con `in: header, name: X-API-Key` igual se envía como `Authorization`.
- **`security: []` en una operación no la hace pública**: hereda la seguridad global.
- Scheme `oauth2` con `tokenUrl` y sin `custom_authorizations_file`: se agrega una request `Get OAuth2 Token - <scheme>` que hace POST a `tokenUrl` con `grant_type=password` y usuario y contraseña `cambiame`, **sea cual sea el flow declarado**. Guarda `Bearer <access_token>` en la variable del scheme. Hay que ajustarla a mano.
- Con `custom_authorizations_file`: esa colección reemplaza a la request autogenerada. Sus requests tienen que guardar el token en una variable de entorno con el **mismo nombre que el scheme** (ej. `pm.environment.set("oauth", "Bearer " + token)`).
- Sin `components.securitySchemes` (OAS3) y sin archivo de auth: se eliminan los headers Authorization y los casos 401/403.

## Después de generar: qué tiene que completar el usuario

En el entorno generado, avisale que revise:
- Variables de token vacías: `<scheme>`, `not_authorized_token`, `forbidden_token` (y `<scheme>2..N` / `application_token` si usó scopes).
- `host` vacío, si no hubo `host` ni patrón que coincida.
- Valores de relleno (`anystring`, `anydate`, `1`) que el backend real va a rechazar. Los IDs de path params tienen que existir en el backend para los casos 2xx.
- Credenciales `cambiame` en la request OAuth2 autogenerada.

Nota: todas las colecciones generadas comparten el mismo `_postman_id` (y todos los entornos el mismo `id`). Al importar varias en la app de Postman, puede pedir reemplazar una por otra.

## Fuera de alcance

Esta skill no cubre:
- Instalar la herramienta (ver skill `instalar-openapi2postman`)
- Ejecutar la colección (Postman, Newman, pipelines) ni interpretar sus resultados
- Corregir el spec OpenAPI más allá de los workarounds mínimos listados
