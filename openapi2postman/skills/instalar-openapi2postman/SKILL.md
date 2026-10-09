---
name: instalar-openapi2postman
description: Explains how to install the openapi2postman tool (npm package `openapi2postman`, command `o2p`), which generates Postman collections with contract tests from an OpenAPI spec. Covers 3 verified paths (global install with npm, local project/pipeline dependency, or from source on GitHub) with their requirements, real limitations and how to verify it works. Use it when the user asks to install openapi2postman or o2p, prepare their machine or pipeline to generate contract tests with Postman, pin a specific version of the tool, update/uninstall it, or asks what they need to use it, even if they don't mention the exact package name. Does NOT cover generating the collection from a spec or running the tests with Postman/Newman.
---

# Install openapi2postman

This skill covers **only** how to get the [openapi2postman](https://github.com/apiaddicts/openapi2postman) tool installed and working (npm package [`openapi2postman`](https://www.npmjs.com/package/openapi2postman), executable `o2p`). It does not cover how to configure it to generate a collection, nor how to run the generated tests.

## Step 0 — check the requirement and present the options, never assume one

1. Check Node.js and npm:
   ```bash
   node -v
   npm -v
   ```
   The tool's README says "node v10 or later", but **that is not true** for current versions: the code uses optional chaining (`?.`) and `require('node:path')`, which need Node 16+. If the user has an older version, warn them to update Node before continuing (this skill does not install Node — see https://nodejs.org/). Verified working with Node 18.20.8 / npm 10.8.2 and Node 25.3.0 / npm 11.6.2.

2. Present the 3 options to the user and ask which one applies. Don't pick one by default without confirming.

| Option | When it fits | How it is invoked | Limitation / note |
|---|---|---|---|
| **1. Global (npm -g)** | Use on the user's machine, the official path in the README | `o2p ...` from any folder | Only one version per machine. On Windows you may need to open a new terminal so the PATH picks up `%APPDATA%\npm` |
| **2. Local in the project (devDependency)** | Pipelines/CI or repos that want to pin the version in `package.json` | `node node_modules/openapi2postman/index.js ...` or an npm script | The `o2p` bin is **not linked** in `node_modules/.bin` (see note below), so `npx o2p` does not work |
| **3. From source (GitHub)** | Testing unpublished changes, contributing, or debugging the tool | `node index.js ...` inside the clone | Requires `git`. Must be updated manually (`git pull` / checkout of another tag) |

Also ask **which version** they want. By default, the latest stable (`latest`). To see the available ones:
```bash
npm view openapi2postman dist-tags
npm view openapi2postman versions
```
There is a `beta` dist-tag (e.g. `2.4.3-beta.1`). Only use it if the user explicitly asks for it.

### Note: why `npx` does not work

The package's `package.json` declares a dependency on itself (`"openapi2postman": "file:"`). Because of that, npm does not create the `node_modules/.bin/o2p` link in local installs or with `npx`. Verified result with 2.4.3:
- `npx -p openapi2postman o2p --help` → `'o2p' is not recognized as an internal or external command...`
- `npx o2p` inside a project with the dependency installed → `404 Not Found - GET https://registry.npmjs.org/o2p`

Don't offer `npx` as an option. If the user asks for it, explain this and suggest option 2.

## Option 1 — Global install

```bash
npm install -g openapi2postman
# or pinning a version
npm install -g openapi2postman@2.4.3
```

Verify:
```bash
o2p --version
o2p --help
```
`--help` must list `-c, --configuration` and `-f, --file`.

Typical problems:
- `o2p: command not found` / `is not recognized`: npm's global folder is not in the PATH. Find it with `npm prefix -g` (on Windows the executables live in that same folder; on Linux/Mac in `<prefix>/bin`) and add it to the PATH, or open a new terminal.
- `EACCES` on Linux/Mac: don't use `sudo npm`. Suggest changing npm's global prefix or using a Node version manager (nvm, fnm, volta).
- PowerShell blocks `o2p.ps1` due to the execution policy: use `o2p.cmd ...` or run it from cmd/Git Bash.

Update: `npm install -g openapi2postman@latest`. Uninstall: `npm uninstall -g openapi2postman`.

## Option 2 — Local project dependency

```bash
npm install --save-dev openapi2postman@2.4.3
```
In pipelines it is best to pin the exact version (`--save-exact`) so the generated contract does not change between runs.

Since the bin is not linked, invoke `index.js` directly:
```bash
node node_modules/openapi2postman/index.js --help
```
Optionally, add it as a script in `package.json` so the team doesn't have to remember the path:
```json
{
  "scripts": {
    "o2p": "node node_modules/openapi2postman/index.js"
  }
}
```
and use it with `npm run o2p -- -f spec.yaml`.

In CI use `npm ci` (with `package-lock.json` committed) instead of `npm install`.

`npm audit` will report vulnerabilities (e.g. `serialize-javascript` via `mocha`): they come from the package declaring `mocha`/`sinon` as production dependencies, not from code that runs during generation. **Do not** run `npm audit fix --force`: npm proposes downgrading openapi2postman to `2.0.9`, which is a downgrade with breaking changes.

## Option 3 — From source

Repo: https://github.com/apiaddicts/openapi2postman (default branch `master`, one tag per release, e.g. `2.4.3`).

```bash
git clone --branch 2.4.3 --depth 1 https://github.com/apiaddicts/openapi2postman.git
cd openapi2postman
npm ci
node index.js --help
```
For the latest unpublished version, clone without `--branch` (it stays on `master`).

## Final verification (any option)

Besides `--help`, confirm it generates something. If the user has an OpenAPI spec at hand, use that one; the package does not ship a ready-to-use example spec. Run from the folder where the spec is:
```bash
o2p -f petstore.yaml          # option 1
# node node_modules/openapi2postman/index.js -f petstore.yaml   (option 2)
# node index.js -f petstore.yaml                                (option 3)
```
Expected output:
```
Collection ./out/petstore_DEV.postman_collection.json was succesfully created
Environment ./out/petstore_DEV.postman_environment.json was succesfully created
```
Without `-c`, the tool uses its default configuration (a `DEV` environment, output in `./out` relative to the current folder). The `out/` folder is only a test: ask the user whether to delete it.

Constraint to keep in mind: the `-c` configuration file **must be inside the current folder**. Otherwise it fails with a misleading message: `configuration file path does not exist or is not correct` (even if the file exists). To allow another folder, set the `O2P_ALLOWED_DIR` environment variable. Careful: with that variable, relative `-c` paths are resolved from `O2P_ALLOWED_DIR`, not from the current folder, so passing an absolute path is best. The `-f` spec does not have that constraint.

## Out of scope

This skill does not cover:
- Writing the configuration file (`o2p_config_file.json`) or generating the collection for a real spec
- Running the generated contract tests (Postman, Newman, pipelines)
- Installing Node.js, npm or git themselves
