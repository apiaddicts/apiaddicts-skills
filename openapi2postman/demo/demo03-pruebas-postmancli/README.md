# Demo 03: ejecución con Postman CLI

Genera la colección desde `httpbin.yaml` y la ejecuta con Postman CLI (skill `ejecutar-pruebas-postman`).

## Requisitos

- openapi2postman (skill `instalar-openapi2postman`)
- Postman CLI. La skill comprueba si está instalado y, si no, pide permiso para instalarlo:
- Global: `npm install -g postman-cli`
- Temporal (sin instalar): `npx -y -p postman-cli postman ...`

No hace falta `postman login` para ejecutar archivos locales. Muestra el aviso `No authorization data found...`, pero ejecuta igual.

## 1. Generar la colección

```bash
o2p -c o2p_config.json -f httpbin.yaml
```

Genera `out/httpbin_DEMO.postman_collection.json` y `out/httpbin_DEMO_env.postman_environment.json` (detalle en [demo01](../demo01-generacion-coleccion)).

## 2. Ejecutar

`bearerAuth` está vacío en el entorno generado, así que se pasa en la ejecución. `demo-token` es un token ficticio: httpbin acepta cualquiera.

```bash
postman collection run out/httpbin_DEMO.postman_collection.json \
  -e out/httpbin_DEMO_env.postman_environment.json \
  --env-var "bearerAuth=Bearer demo-token" \
  --no-report-events \
  -r cli,json,junit,html \
  --reporter-json-structure newman \
  --reporter-json-export reportes/resultado.json \
  --reporter-junit-export reportes/resultado.xml \
  --reporter-html-export reportes/resultado.html
```

- `--no-report-events` evita que Postman CLI envíe analíticas de la ejecución (las envía por defecto).
- `--reporter-json-structure newman` genera el JSON con la misma estructura que Newman, que es la que necesita el script de resumen.

Exit code esperado: `1`, porque hay tests que fallan a propósito.

## 3. Resumen

```bash
node ../../skills/ejecutar-pruebas-postman/scripts/resumen-reporte.js reportes/resultado.json
```

## Resultado esperado

| Caso | Resultado | Por qué |
|---|---|---|
| TC.001.001.200 `GET /bearer` con token | ✅ | 200 y schema válido |
| TC.001.001.401 `GET /bearer` sin token | ✅ | 401 |
| TC.002.001.200 `POST /post` | ✅ | 200 y schema válido (httpbin devuelve el body en `json`) |
| TC.002.001.400a–e `POST /post` inválido | ❌ ×5 | `status esperado 400, recibido 200`: httpbin no valida el body. En una API real, esto indica que no cumple el contrato |

**8 casos: 3 pasados, 5 fallidos (38%). 10 assertions, 5 fallidas.** Resumen completo en [`reportes/resumen.md`](reportes/resumen.md).

## Reportes (`reportes/`)

| Archivo | Formato |
|---|---|
| `resultado.json` | JSON con estructura Newman (entrada del resumen) |
| `resultado.xml` | JUnit (un `testsuite` por caso) |
| `resultado.html` | HTML navegable |
| `resumen.md` | Salida del script de resumen |

En los reportes guardados se reemplazó la IP pública que devuelve httpbin (`origin`) por `0.0.0.0`.
