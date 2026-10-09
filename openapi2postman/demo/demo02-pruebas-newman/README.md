# Demo 02: running with Newman

Generates the collection from `httpbin.yaml` and runs it with Newman (skill `ejecutar-pruebas-postman`).

## Requirements

- openapi2postman (skill `instalar-openapi2postman`)
- Newman. The skill checks whether it is installed and, if not, asks permission to install it:
- Global: `npm install -g newman newman-reporter-htmlextra`
- Temporary (without installing): `npx -y -p newman@6 -p newman-reporter-htmlextra newman ...`

## 1. Generate the collection

```bash
o2p -c o2p_config.json -f httpbin.yaml
```

Generates `out/httpbin_DEMO.postman_collection.json` and `out/httpbin_DEMO_env.postman_environment.json` (details in [demo01](../demo01-generacion-coleccion)).

## 2. Run

`bearerAuth` is empty in the generated environment, so it is passed at run time. `demo-token` is a dummy token: httpbin accepts any.

```bash
newman run out/httpbin_DEMO.postman_collection.json \
  -e out/httpbin_DEMO_env.postman_environment.json \
  --env-var "bearerAuth=Bearer demo-token" \
  -r cli,json,junit,htmlextra \
  --reporter-json-export reportes/resultado.json \
  --reporter-junit-export reportes/resultado.xml \
  --reporter-htmlextra-export reportes/resultado.html
```

The HTML report uses `newman-reporter-htmlextra`: the `newman-reporter-html` reporter is not compatible with Newman 6.

Expected exit code: `1`, because some tests fail on purpose.

## 3. Summary

```bash
node ../../skills/ejecutar-pruebas-postman/scripts/resumen-reporte.js reportes/resultado.json
```

## Expected result

| Case | Result | Why |
|---|---|---|
| TC.001.001.200 `GET /bearer` with token | ✅ | 200 and valid schema |
| TC.001.001.401 `GET /bearer` without token | ✅ | 401 |
| TC.002.001.200 `POST /post` | ✅ | 200 and valid schema (httpbin returns the body in `json`) |
| TC.002.001.400a–e invalid `POST /post` | ❌ ×5 | `expected status 400, got 200`: httpbin does not validate the body. In a real API, this means it does not comply with the contract |

**8 cases: 3 passed, 5 failed (38%). 10 assertions, 5 failed.** Full summary in [`reportes/resumen.md`](reportes/resumen.md).

## Reports (`reportes/`)

| File | Format |
|---|---|
| `resultado.json` | JSON with Newman structure (summary input) |
| `resultado.xml` | JUnit (one `testsuite` per case) |
| `resultado.html` | Browsable HTML |
| `resumen.md` | Output of the summary script |

In the saved reports, the public IP returned by httpbin (`origin`) was replaced with `0.0.0.0`.
