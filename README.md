# 🧩 Rave-Maker [![rave-maker CI](https://github.com/mecster09/rave-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/mecster09/rave-maker/actions/workflows/ci.yml)

This project simulates the **Medidata Rave Web Services (RWS)** API with **strict XML** outputs, implemented in **Fastify + TypeScript**.  
It supports AI training, integration testing, and developer sandboxing aligned to RWS documentation sections 1.1.2, 1.5.x, and 1.7.x.

## Overview
Implements key RWS endpoints:
1. **Study Metadata (1.5.1.1)** — `GET /studies/{study-oid}/datasets/metadata/regular`
2. **Audit Records (1.5.3.4)** — `GET /datasets/ClinicalAuditRecords.odm`
3. **Subjects (1.5.9)** — `GET /studies/{study-oid}/Subjects`

All responses are **ODM v1.3 XML** and require Basic Auth with a fixed test token.

```
Authorization: Basic VEVTVF9VU0VSOlRFU1RfUEFTU1dPUkQ=
```
Default credentials: `TEST_USER` / `TEST_PASSWORD` (combined as `Basic base64(username:password)`).

## Error Codes (from RWS §1.7.8)
| HTTP | RWS Code | Meaning |
|------|-----------|----------|
| 401 | RWS00008 | Unauthorized |
| 404 | RWS00012 | Study OID not found |
| 404 | RWS00013 | No subjects found |
| 500 | RWS00100 | Internal error |

## Structure
```
src/              # Fastify source code
  index.ts        # Main API server
  utils/          # Helper modules
mockData/         # Static XML files
tests/unit/       # Vitest unit tests
.github/workflows/ci.yml  # GitHub Actions CI pipeline
Dockerfile        # Build & run container
README.md
```

## Development
```bash
npm install
npm run dev
npm test
```

## Configuration: Mock vs Simulator

The server can serve data from static XML in `mockData/` (default) or from a ticking simulator that generates clinical data progressively over time.

- Config file: `config/simulator.json`
- Environment override: set `DATA_MODE=mock` or `DATA_MODE=simulator`
- Automated tests (`vitest`) always run in mock mode regardless of file settings

Example `config/simulator.json` (extended):
```json
{
  "dataMode": "simulator",
  "study": { "oid": "Mediflex(Prod)", "interval_ms": 1500, "batch_percentage": 25, "speed_factor": 1.0 },
  "auth": { "username": "TEST_USER", "password": "TEST_PASSWORD" },
  "persistence": { "enabled": true, "state_file": "data/simulator-state.json", "fresh_seed_on_start": false },
  "structure": { "sites": 2, "subjects_per_site": 3, "progress_increment": 10 },
  "logging": { "simulator": true, "generator": true },
  "visits": {
    "templates": [
      { "name": "Demographics", "day_offset": 0,  "forms": [ { "oid": "DM", "name": "Demographics" } ] },
      { "name": "Visit 1",     "day_offset": 14, "forms": [ { "oid": "VS", "name": "Vitals" } ] }
    ],
    "probabilities": { "delayed": 0.2, "missed": 0.1, "partial": 0.15 },
    "delay_ms": { "min": 3600000, "max": 172800000 }
  },
  "audit": { "user": "raveuser", "field_oids": ["DM.SEX","VS.HR"], "per_page_default": 500 }
}
```

When `dataMode` is `simulator`:
- `GET /RaveWebServices/studies/{study-oid}/Subjects` returns generated subjects.
- `GET /RaveWebServices/datasets/ClinicalAuditRecords.odm` returns generated audit records (supports `startid` and `per_page`).
- Control endpoints (XML):
  - `POST /simulator/tick` advance one tick
  - `POST /simulator/control/{pause|resume|reset|tick}`
  - `GET /simulator/status` simulator status

  - Example curls (use values from `config/simulator.json`):
    - Metadata for `study.oid`:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/studies/Mediflex(Prod)/datasets/metadata/regular"`
    - Subjects feed:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/studies/Mediflex(Prod)/Subjects"`
    - Audit records (override `per_page`/`startid` as needed):<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?per_page=5&startid=1"`
   - Manual tick:<br>`curl -u TEST_USER:TEST_PASSWORD -X POST "http://localhost:3000/simulator/tick"`
    - Pause/resume/reset:<br>`curl -u TEST_USER:TEST_PASSWORD -X POST "http://localhost:3000/simulator/control/pause"`
    - Simulator status:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/simulator/status"`

Simulator behavior
- Auto vs manual: `study.interval_ms` controls auto-ticking (0 disables).
- Batch: `study.batch_percentage` controls subjects processed per tick.
- Time: `study.speed_factor` accelerates timestamps.
- Visits: define `visits.templates` with forms; probabilities `delayed|missed|partial` control outcomes. Delays use `visits.delay_ms` range.
- Subjects/XML: simulator adds `CurrentVisit`, `VisitStatus`, and optional `DelayedUntil` attributes.
- Metadata/XML: simulator's metadata reflects configured forms when simulator mode is enabled.
- Persistence: `persistence.enabled` keeps simulator state on disk; set `persistence.fresh_seed_on_start` to force a reseed on the next boot.

### Simulator Options (Overview)
- study
  - `oid`: default Study OID used by the simulator when needed.
  - `interval_ms`: auto tick interval; set `0` for manual.
  - `batch_percentage`: percent of subjects processed per tick (0–100).
  - `speed_factor`: time multiplier for timestamps (1.0 = real-time).
- auth
  - `username` / `password`: combined into the expected `Authorization` header (`Basic base64(username:password)`).
- persistence
  - `enabled`: toggle on-disk simulator state (defaults to true).
  - `state_file`: path to the persisted JSON state (directories created automatically).
  - `fresh_seed_on_start`: ignore saved state once and rebuild new subjects/visits.
- structure
  - `sites`: number of sites.
  - `subjects_per_site`: subjects per site.
  - `progress_increment`: percent progress added per tick.
  - `site_names`: optional array of friendly site names (used in Subjects XML as `SiteName`).
- logging
  - `simulator`: enable high-level simulator logs.
  - `generator`: enable generator logs per tick.
- visits
  - `templates`: ordered list of visits with `name`, `day_offset` (from Day 0), and `forms`.
  - `days_between`: convenience gaps; the loader normalizes this into `templates[].day_offset`.
  - `probabilities`: control outcomes `{ delayed, missed, partial }` (0–1 each).
  - `delay_ms`: `{ min, max }` delay window applied when `delayed` occurs.
- audit
  - `user`: username placed on generated `<AuditRecord/>` rows.
  - `field_oids`: list of field OIDs to generate changes for.
  - `per_page_default`: default page size when `per_page` query is omitted.
- values
  - `rules`: per-field generation rules:
    - `type`: `enum` | `number` | `string`
    - `enum`: cycles through values
    - `range`: `{ min, max }` random int in range
    - `pattern`: string with `{n}` placeholder for incrementing sequences

Minimal simulator config (quick start):
```json
{
  "dataMode": "simulator",
  "structure": { "sites": 1, "subjects_per_site": 3 },
  "visits": { "templates": [ { "name": "Demographics", "day_offset": 0, "forms": [ { "oid": "DM", "name": "Demographics" } ] } ] }
}
```

Commented example
- JSON does not support comments; see `config/simulator.example.jsonc` for a commented template you can copy to `config/simulator.json` and edit.

## Docker
```bash
docker build -t rave-maker .
docker run -p 3000:3000 rave-maker
```

## GitHub Actions
Workflow `.github/workflows/ci.yml` automatically:
1. Checks out code
2. Installs deps
3. Builds TS
4. Runs unit tests
