# Resumen de ejecución: httpbin_DEMO

- Casos de prueba (requests): 8 | pasados: 3 | fallidos: 5 | éxito: 38%
- Assertions: 10 | fallidas: 5
- Duración: 2.2 s

## Por carpeta

| Carpeta | Pasados | Fallidos |
|---|---|---|
| 001.bearer | 2 | 0 |
| 002.post | 1 | 5 |

## Motivos de fallo más frecuentes

- 5 × status esperado 400, recibido 200

## Casos fallidos

- **TC.002.001.400a Error without.name** (POST, respondió 200)
  - Status code is 400: status esperado 400, recibido 200
- **TC.002.001.400b Error without.age** (POST, respondió 200)
  - Status code is 400: status esperado 400, recibido 200
- **TC.002.001.400c Error with.name.wrong** (POST, respondió 200)
  - Status code is 400: status esperado 400, recibido 200
- **TC.002.001.400d Error with.age.wrong** (POST, respondió 200)
  - Status code is 400: status esperado 400, recibido 200
- **TC.002.001.400e Error with.vaccinated.wrong** (POST, respondió 200)
  - Status code is 400: status esperado 400, recibido 200
