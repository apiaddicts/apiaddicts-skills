---
name: instalar-openapi2postman
description: Enseña cómo instalar la herramienta openapi2postman (paquete npm `openapi2postman`, comando `o2p`) que genera colecciones Postman con contract tests a partir de un spec OpenAPI. Cubre 3 caminos verificados (instalación global con npm, dependencia local del proyecto/pipeline, o desde el código fuente en GitHub) con sus requisitos, limitaciones reales y cómo verificar que quedó funcionando. Úsala cuando el usuario pida instalar openapi2postman u o2p, preparar su máquina o pipeline para generar contract tests con Postman, fijar una versión concreta de la herramienta, actualizarla/desinstalarla, o pregunte qué necesita para usarla, incluso si no menciona el nombre exacto del paquete. NO cubre generar la colección desde un spec ni ejecutar los tests con Postman/Newman.
---

# Instalar openapi2postman

Esta skill cubre **solo** cómo dejar instalada y funcionando la herramienta [openapi2postman](https://github.com/apiaddicts/openapi2postman) (paquete npm [`openapi2postman`](https://www.npmjs.com/package/openapi2postman), ejecutable `o2p`). No cubre cómo configurarla para generar una colección, ni cómo ejecutar los tests generados.

## Paso 0 — verificar requisito y presentar las opciones, nunca asumir una

1. Verificar Node.js y npm:
   ```bash
   node -v
   npm -v
   ```
   El README de la herramienta dice "node v10 or later", pero **no es cierto** para las versiones actuales: el código usa optional chaining (`?.`) y `require('node:path')`, que necesitan Node 16+. Si el usuario tiene una versión menor, avisale y que actualice Node antes de seguir (esta skill no instala Node — ver https://nodejs.org/). Verificado funcionando con Node 18.20.8 / npm 10.8.2 y Node 25.3.0 / npm 11.6.2.

2. Presentale al usuario las 3 opciones y preguntale cuál aplica. No elijas una por defecto sin confirmar.

| Opción | Cuándo conviene | Cómo se invoca | Limitación / nota |
|---|---|---|---|
| **1. Global (npm -g)** | Uso en la máquina del usuario, el camino oficial del README | `o2p ...` desde cualquier carpeta | Una sola versión por máquina. En Windows puede requerir abrir una terminal nueva para que el PATH tome `%APPDATA%\npm` |
| **2. Local en el proyecto (devDependency)** | Pipelines/CI o repos que quieren fijar la versión en `package.json` | `node node_modules/openapi2postman/index.js ...` o un script de npm | El bin `o2p` **no se enlaza** en `node_modules/.bin` (ver nota abajo), así que `npx o2p` no funciona |
| **3. Desde el código fuente (GitHub)** | Probar cambios no publicados, contribuir, o depurar la herramienta | `node index.js ...` dentro del clon | Requiere `git`. Hay que actualizar a mano (`git pull` / checkout de otro tag) |

Preguntá también **qué versión** quiere. Por defecto la última estable (`latest`). Para ver las disponibles:
```bash
npm view openapi2postman dist-tags
npm view openapi2postman versions
```
Existe un dist-tag `beta` (ej. `2.4.3-beta.1`). Solo usarlo si el usuario lo pide explícitamente.

### Nota: por qué `npx` no funciona

El `package.json` del paquete declara una dependencia de sí mismo (`"openapi2postman": "file:"`). Con eso npm no crea el enlace `node_modules/.bin/o2p` en instalaciones locales ni con `npx`. Resultado verificado con 2.4.3:
- `npx -p openapi2postman o2p --help` → `"o2p" no se reconoce como un comando...`
- `npx o2p` dentro de un proyecto con la dependencia instalada → `404 Not Found - GET https://registry.npmjs.org/o2p`

No ofrezcas `npx` como opción. Si el usuario lo pide, explicale esto y proponé la opción 2.

## Opción 1 — Instalación global

```bash
npm install -g openapi2postman
# o fijando versión
npm install -g openapi2postman@2.4.3
```

Verificar:
```bash
o2p --version
o2p --help
```
`--help` debe listar `-c, --configuration` y `-f, --file`.

Problemas típicos:
- `o2p: command not found` / `no se reconoce`: la carpeta global de npm no está en el PATH. Ver dónde está con `npm prefix -g` (en Windows los ejecutables quedan en esa misma carpeta; en Linux/Mac en `<prefix>/bin`) y agregarla al PATH, o abrir una terminal nueva.
- `EACCES` en Linux/Mac: no usar `sudo npm`. Proponer cambiar el prefix global de npm o usar un gestor de versiones de Node (nvm, fnm, volta).
- PowerShell bloquea `o2p.ps1` por la execution policy: usar `o2p.cmd ...` o ejecutarlo desde cmd/Git Bash.

Actualizar: `npm install -g openapi2postman@latest`. Desinstalar: `npm uninstall -g openapi2postman`.

## Opción 2 — Dependencia local del proyecto

```bash
npm install --save-dev openapi2postman@2.4.3
```
Conviene fijar versión exacta (`--save-exact`) en pipelines para que el contrato generado no cambie entre corridas.

Como el bin no se enlaza, invocar el `index.js` directo:
```bash
node node_modules/openapi2postman/index.js --help
```
Opcional, dejarlo como script en `package.json` para que el equipo no tenga que recordar la ruta:
```json
{
  "scripts": {
    "o2p": "node node_modules/openapi2postman/index.js"
  }
}
```
y usarlo con `npm run o2p -- -f spec.yaml`.

En CI usar `npm ci` (con `package-lock.json` commiteado) en vez de `npm install`.

`npm audit` va a reportar vulnerabilidades (ej. `serialize-javascript` vía `mocha`): vienen de que el paquete declara `mocha`/`sinon` como dependencias de producción, no de código que se ejecute al generar. **No** corras `npm audit fix --force`: npm propone bajar openapi2postman a `2.0.9`, lo que es un downgrade con breaking changes.

## Opción 3 — Desde el código fuente

Repo: https://github.com/apiaddicts/openapi2postman (rama por defecto `master`, un tag por release, ej. `2.4.3`).

```bash
git clone --branch 2.4.3 --depth 1 https://github.com/apiaddicts/openapi2postman.git
cd openapi2postman
npm ci
node index.js --help
```
Para la última versión sin publicar, clonar sin `--branch` (queda en `master`).

## Verificación final (cualquier opción)

Además de `--help`, confirmar que genera algo. Si el usuario tiene un spec OpenAPI a mano, usá ese; el paquete no trae un spec de ejemplo listo. Ejecutar desde la carpeta donde está el spec:
```bash
o2p -f petstore.yaml          # opción 1
# node node_modules/openapi2postman/index.js -f petstore.yaml   (opción 2)
# node index.js -f petstore.yaml                                (opción 3)
```
Salida esperada:
```
Collection ./out/petstore_DEV.postman_collection.json was succesfully created
Environment ./out/petstore_DEV.postman_environment.json was succesfully created
```
Sin `-c`, la herramienta usa su configuración por defecto (un entorno `DEV`, salida en `./out` relativa a la carpeta actual). La carpeta `out/` es solo de prueba: preguntale al usuario si la borra.

Restricción a tener en cuenta: el archivo de configuración `-c` **tiene que estar dentro de la carpeta actual**. Si no, falla con un mensaje engañoso: `configuration file path does not exist or is not correct` (aunque el archivo exista). Para permitir otra carpeta, definir la variable de entorno `O2P_ALLOWED_DIR`. Ojo: con esa variable, las rutas relativas de `-c` se resuelven desde `O2P_ALLOWED_DIR`, no desde la carpeta actual, así que conviene pasar la ruta absoluta. El spec `-f` no tiene esa restricción.

## Fuera de alcance

Esta skill no cubre:
- Escribir el archivo de configuración (`o2p_config_file.json`) ni generar la colección para un spec real
- Ejecutar los contract tests generados (Postman, Newman, pipelines)
- Instalar Node.js, npm o git en sí mismos
