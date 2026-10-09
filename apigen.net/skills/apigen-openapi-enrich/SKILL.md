---
name: apigen-openapi-enrich
description: >
  Adds/fixes the x-apigen-* extensions (x-apigen-project,
  x-apigen-models, x-apigen-mapping, x-apigen-binding) in a new or
  incomplete OpenAPI spec so that apigen.net generates it correctly, translating
  standard `type`/`format` into ApiGen's exact vocabulary and detecting
  entities/relations from the schemas and paths. Use when the
  user asks to "add the x-apigen properties to my OpenAPI", "complete my
  spec for apigen", "my OpenAPI is new, help me prepare it", or wants to fix the findings reported by the
  apigen-openapi-check skill.
---

# ApiGen OpenAPI Enrich Skill

Drafts and adds the `x-apigen-*` extensions an OpenAPI spec is missing
so that `apigen.net` generates it correctly. Complements
`apigen-openapi-check` (which only detects gaps): this skill **drafts the
content** and edits it into the spec.

**Explicit scope:** it only adds/fixes extensions. It doesn't install or
invoke the CLI/REST — it hands off to `apigen-cli` (CLI) or `apigen-api` (REST)
once the spec is ready. At the end of its flow it runs `apigen-openapi-check`
as verification; it doesn't reinvent those rules.

---

## Type vocabulary table — single source of truth

**`attributes[].type`** (case-insensitive, use exactly one of these —
any other value produces a nonexistent C# type that doesn't compile):

| ApiGen `type` | Resulting C# type |
|---|---|
| `Integer` / `Long` / `Number` | `long?` |
| `Boolean` | `bool?` |
| `LocalDate` / `LocalDateTime` | `DateTime?` |
| `String` | `string?` |
| `Array` | `List<{items-type}>?` |
| `Relation` | `{items-type}?` |

**Important — `x-apigen-models.attributes[].type` has no concept of
`format`.** The `type: String` + `format: date`/`date-time` → `DateTime?`
translation **only applies to the DTO** (the standard schema in
`components.schemas`, which does have `format`) — the function that translates
`x-apigen-models.attributes[].type` (`FormatTypeEntity`) never receives
`format`, so a date attribute on an entity must be declared
**explicitly** as `type: LocalDate` or `type: LocalDateTime`, never
`type: String` even if the equivalent field in the DTO has
`format: date-time` — using `String` there will generate `string?` in the entity
instead of `DateTime?`, silently.

**`attributes[].items-type`** — does **not** use this vocabulary, it's a **literal
C# token** substituted as-is:
- Array of scalars → the real C# type name: `string`, `long`, `bool`,
  `DateTime` (never `String`/`Integer`/etc.).
- `Array`/`Relation` of a related entity → the **exact (case-sensitive) name
  of that entity's key** in `x-apigen-models` — it isn't
  automatically Pascalized at this point, it must match literally.

**Entity naming rule:** decide each entity's name up front in singular
PascalCase (e.g. `Pet`, not `pet` or `Pets`) and **reuse that same
literal string** in `x-apigen-models` (key), `x-apigen-binding.model`,
`x-apigen-mapping.model` and relation `items-type`. Don't vary it from one
place to another — several parts of the generator compare the string as-is, not
Pascalized.

---

## Procedure

### 1. Read the user's spec

Review `components.schemas` and `paths`. If it already has some `x-apigen-*`, don't
overwrite it without confirming with the user first.

### 2. Verify/add `operationId` on every operation — before anything else

**This isn't an `x-apigen-*` extension, it's a standard OpenAPI field, but
it's mandatory for ApiGen and this was confirmed by breaking the generator
directly**: without `operationId`, `ControllersGenerator` blows up with
`ArgumentNullException` in `Humanizer.Pascalize` when generating the controller —
it's not a silent degradation, it's a hard crash. Many editors don't
flag it as mandatory, so it's easy for a new spec to lack it.

Before touching any `x-apigen-*` extension, go through **all**
operations (`get`/`post`/`put`/`patch`/`delete`/etc. of every path) and
propose a unique, descriptive `operationId` if it's missing (e.g. `getBooks`,
`createBook`, `getBookById`) — camelCase, verb + resource, no spaces.

### 3. Declare every used tag in the root `tags:` array — before continuing

**Another critical standard OpenAPI field (not `x-apigen-*`), confirmed by
generating and running the real project, not just by reading code:** if two or
more operations share a tag (e.g. `tags: [books]`) and that name is **not**
declared in the document's root `tags:` array, the OpenAPI
reader creates a separate tag object per operation even though the name is the
same. `ControllersGenerator` compares tags by object reference, not by
name — result: **only one of those operations survives in the generated
controller, the rest silently disappear** (no generation or
compilation error, the project compiles anyway but is missing
endpoints).

Before proposing `x-apigen-binding`, go through all the `tags: [...]` used
in the operations and add one for each distinct name to the root array:
```yaml
tags:
  - name: books
```
If the user's spec already has paths with the same tag repeated across several
operations and does **not** have this root array, treat it as a critical finding
just as urgent as a missing `x-apigen-models` — it's not optional even though
the spec is technically valid without it.

### 4. Propose `x-apigen-models` for each persisted entity

**Mandatory location: under `components`, not at the document root**
(`components.x-apigen-models`, sibling of `components.schemas`) —
confirmed with `apigen-openapi-check`: placed at the root, the checker
reports it as "missing or empty under 'components'" and the generator creates a
placeholder `Sample` entity instead of the real ones.
```yaml
components:
  x-apigen-models:
    Pet:
      attributes: { ... }
  schemas:
    PetDto: { ... }
```

One or more schemas can map to the same entity (e.g. `Pet`, `PetGet`,
`PetPost` → all to the `Pet` entity) — identify the set and a single
entity key for all of them.

For each schema property:
- Translate the OpenAPI `type`/`format` into the vocabulary of the table above.
- **Primary key:** heuristic — an `id` property, or `format: uuid`. If it's
  ambiguous, ask the user instead of guessing. Mark it with
  `relational-persistence.primary-key: true`.
- **Relations** (`$ref` to another schema, or an array of another schema): use
  `type: Relation` (one) or `type: Array` (many) + `items-type:
  <ExactEntityName>`. For it to be a real FK (not just navigation),
  add `relational-persistence.column` with a name **different** from
  the property's (e.g. property `owner` → column `owner_id`) — if the column
  name matches the property's, the generator doesn't treat it as an
  FK.
  - **Known generator limitation — warn, don't try to compensate:** the
    scalar FK column the generator creates for a relation always
    ends up typed `long?`, regardless of the actual type of the referenced
    entity's primary key (internal resolution bug). If the referenced
    entity has a non-numeric PK (e.g. `uuid`/`string`),
    warn the user about this explicitly — there's no combination of
    properties in the OpenAPI that fixes it, the generator would need a
    code fix.
- **Validations** — use standard OpenAPI keywords, never the
  `x-apigen-models.attributes[].validations` key (decorative, the generator doesn't
  read it):
  - `[StringLength]` comes from `minLength` **and** `maxLength` together (both or
    neither — just one doesn't activate anything).
  - `[Range]` comes from `minimum` **and** `maximum` together (same case).
  - `format: date-time` on a `string` → `DataType.DateTime`; any
    other `format` on a string falls back to `DataType.Date` as well (there's no real
    mapping for `email`/`uuid`/etc. — don't promise that behavior).
  - `pattern` is never read, don't suggest it as if it had an effect.
- `relational-persistence.table` is optional — if omitted, EF Core uses the
  class/entity name as the table by default. Only add it if the
  user wants a different table name (e.g. explicit snake_case).

### 5. Propose `x-apigen-mapping` for each DTO

For each schema used as a request/response body in any path:
```yaml
components:
  schemas:
    PetDto:
      x-apigen-mapping:
        model: Pet
```

### 6. Propose `x-apigen-binding` for each path of the resource

`x-apigen-binding` only needs to be on one path per tag group for
the controller to be generated, but if two paths of the same tag declared
different models, only the first one appearing in the document wins for *all*
operations — to avoid that risk, **apply it to all paths of the
same resource**, not just one:
```yaml
paths:
  /pets:
    x-apigen-binding: { model: Pet }
  /pets/{id}:
    x-apigen-binding: { model: Pet }
```

### 7. Propose `x-apigen-project`

Ask the user whether they need PostgreSQL/MySQL or whether in-memory is fine:
```yaml
x-apigen-project:
  data-driver: postgresql   # or mysql / omit for in-memory
```
**Don't add** `name`/`description`/`version` — they're decorative,
confirmed as never read by the generator (`apigen-openapi-check` already
flags them as such). If the user insists on having them, clarify this before
adding them.

### 8. Confirm before editing

Present the full summary of what will be added (all
entities/mappings/bindings together, not field by field) and ask for **a** single
confirmation before touching the user's file.

### 9. Apply and verify

Apply the changes with `Edit`. Then run the validation skill/script
on the result — the validator lives in the `apigen-openapi-check` skill
(sibling folder `../apigen-openapi-check/scripts/`):
```bash
../apigen-openapi-check/scripts/apigen-openapi-check.sh "<spec-path>"
```
```powershell
../apigen-openapi-check/scripts/apigen-openapi-check.ps1 -Spec "<spec-path>"
```
If you don't know the exact path where both skills were installed, locate
the script with `find . -path '*apigen-openapi-check/scripts/apigen-openapi-check.sh'`
(Unix) or `Get-ChildItem -Recurse -Filter apigen-openapi-check.ps1` (Windows).

Report to the user whether it came out clean (0 critical) or whether something needs another
pass. Only then suggest continuing with `apigen-cli` / `apigen-api` to
generate the project.
