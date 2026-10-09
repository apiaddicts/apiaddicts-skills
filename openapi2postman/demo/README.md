# Demos

End-to-end test cases for the skills, against [httpbin.org](https://httpbin.org/#/). Each demo is self-contained and includes its own API definition (`httpbin.yaml`) with **2 paths**:

| Path | What it tests | Expected result |
|---|---|---|
| `GET /bearer` | Bearer authentication: 200 with token, 401 without token | ✅ Everything passes |
| `POST /post` | `Mascota` body with required fields and constraints (`maxLength`, `maximum`, types) | ✅ 200 passes. ❌ The 5 400 cases fail **on purpose**: httpbin does not validate the body and returns 200, which is useful to see how contract failures are reported |

| Demo | Skill | Contents |
|---|---|---|
| [`demo01-generacion-coleccion`](demo01-generacion-coleccion) | `generar-coleccion-postman` | Spec + config → Postman collection and environment in `out/` |
| [`demo02-pruebas-newman`](demo02-pruebas-newman) | `ejecutar-pruebas-postman` (Newman) | Generates the collection and runs it with Newman. JSON, JUnit and HTML reports in `reportes/` |
| [`demo03-pruebas-postmancli`](demo03-pruebas-postmancli) | `ejecutar-pruebas-postman` (Postman CLI) | Same as demo02, but with Postman CLI |

Versions used: openapi2postman 2.4.3, Newman 6, newman-reporter-htmlextra, Postman CLI 1.62.0 and Node 25.

Note: httpbin returns the caller's public IP in the `origin` field. In the saved reports it was replaced with `0.0.0.0`. If you regenerate the reports, review them before committing them.
