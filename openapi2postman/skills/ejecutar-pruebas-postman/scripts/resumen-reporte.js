#!/usr/bin/env node
// Resume un reporte JSON con estructura Newman (Newman `-r json` o Postman CLI
// `-r json --reporter-json-structure newman`). Uso:
//   node resumen-reporte.js <ruta/al/reporte.json> [--max-fallos N]
'use strict'

const fs = require('fs')

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const maxIdx = args.indexOf('--max-fallos')
const maxFallos = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 50

if (!file) {
  console.error('Uso: node resumen-reporte.js <reporte.json> [--max-fallos N]')
  process.exit(2)
}

let report
try {
  report = JSON.parse(fs.readFileSync(file, 'utf8'))
} catch (e) {
  console.error('No se pudo leer el reporte JSON: ' + e.message)
  process.exit(2)
}
// La estructura nativa de Postman CLI también tiene run.executions, pero con otra forma
// (run.meta/run.summary, executions[].requestExecuted): resumirla daría resultados falsos.
if (!report.run || !Array.isArray(report.run.executions) || !report.run.stats || report.run.summary) {
  console.error('El JSON no tiene estructura Newman. En Postman CLI genera el JSON con --reporter-json-structure newman.')
  process.exit(2)
}

// Mapa id de request -> carpeta raíz (primer nivel de la colección)
const folderOf = {}
function walk(items, root) {
  for (const it of items || []) {
    const top = root || it.name
    if (it.request) folderOf[it.id] = top
    if (it.item) walk(it.item, top)
  }
}
walk(report.collection && report.collection.item)

function reason(msg) {
  if (!msg) return 'error sin mensaje'
  const m = /expected response to have status code (\d+) but got (\d+)/.exec(msg)
  if (m) return `status esperado ${m[1]}, recibido ${m[2]}`
  if (/keyword|dataPath|instancePath/.test(msg)) return 'respuesta no cumple el schema (AJV)'
  if (/responseBody no es un JSON|Unexpected token|JSONError/.test(msg)) return 'la respuesta no es JSON'
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|certificate|socket hang up/i.test(msg)) return 'error de conexión: ' + msg.split('\n')[0].slice(0, 80)
  return msg.split('\n')[0].slice(0, 100)
}

const casos = []
for (const ex of report.run.executions) {
  const name = ex.item && ex.item.name
  const folder = folderOf[ex.item && ex.item.id] || '(sin carpeta)'
  const asserts = ex.assertions || []
  const fallidas = asserts.filter(a => a.error)
  const reqErr = ex.requestError && (ex.requestError.message || ex.requestError.code)
  const code = ex.response && ex.response.code
  casos.push({
    name, folder, code,
    method: ex.request && ex.request.method,
    ok: !reqErr && fallidas.length === 0,
    motivos: reqErr ? [reason(String(reqErr))] : fallidas.map(a => `${a.assertion}: ${reason(a.error.message)}`),
    motivoCorto: reqErr ? reason(String(reqErr)) : (fallidas[0] && reason(fallidas[0].error.message))
  })
}
// Errores de request que Newman no serializa en executions
for (const f of report.run.failures || []) {
  if (f.at === 'request' || (f.error && /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/.test(f.error.message || ''))) {
    const c = casos.find(x => x.name === (f.source && f.source.name) && x.ok)
    if (c) { c.ok = false; c.motivos = [reason(f.error.message)]; c.motivoCorto = c.motivos[0] }
  }
}

const st = report.run.stats || {}
const total = casos.length
const pasados = casos.filter(c => c.ok).length
const fallados = total - pasados
const pct = total ? Math.round((pasados / total) * 100) : 0

const out = []
out.push(`# Resumen de ejecución: ${report.collection && report.collection.info ? report.collection.info.name : file}`)
out.push('')
out.push(`- Casos de prueba (requests): ${total} | pasados: ${pasados} | fallidos: ${fallados} | éxito: ${pct}%`)
if (st.assertions) out.push(`- Assertions: ${st.assertions.total} | fallidas: ${st.assertions.failed}`)
if (report.run.timings && report.run.timings.completed && report.run.timings.started) {
  out.push(`- Duración: ${((report.run.timings.completed - report.run.timings.started) / 1000).toFixed(1)} s`)
}
out.push('')
out.push('## Por carpeta')
out.push('')
out.push('| Carpeta | Pasados | Fallidos |')
out.push('|---|---|---|')
const byFolder = {}
for (const c of casos) {
  byFolder[c.folder] = byFolder[c.folder] || { p: 0, f: 0 }
  byFolder[c.folder][c.ok ? 'p' : 'f']++
}
for (const [k, v] of Object.entries(byFolder)) out.push(`| ${k} | ${v.p} | ${v.f} |`)

if (fallados) {
  out.push('')
  out.push('## Motivos de fallo más frecuentes')
  out.push('')
  const hist = {}
  for (const c of casos.filter(c => !c.ok)) hist[c.motivoCorto] = (hist[c.motivoCorto] || 0) + 1
  for (const [k, v] of Object.entries(hist).sort((a, b) => b[1] - a[1])) out.push(`- ${v} × ${k}`)
  out.push('')
  out.push('## Casos fallidos')
  out.push('')
  const fl = casos.filter(c => !c.ok)
  for (const c of fl.slice(0, maxFallos)) {
    out.push(`- **${c.name}** (${c.method || '?'}${c.code ? ', respondió ' + c.code : ''})`)
    for (const m of c.motivos) out.push(`  - ${m}`)
  }
  if (fl.length > maxFallos) out.push(`- … y ${fl.length - maxFallos} más (usa --max-fallos para ver más)`)
}

console.log(out.join('\n'))
