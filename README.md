# Rave-Maker [![rave-maker CI](https://github.com/mecster09/rave-maker/actions/workflows/ci.yml/badge.svg)](https://github.com/mecster09/rave-maker/actions/workflows/ci.yml)

This project simulates the **Medidata Rave Web Services (RWS)** API with **strict XML** outputs, implemented in **Fastify + TypeScript**. It supports AI training, integration testing, and developer sandboxing aligned to RWS documentation sections 1.1.2, 1.5.x, and 1.7.x.

## Overview

Implements key RWS endpoints:
- **Version (4.1)** — `GET /RaveWebServices/version`
- **Build Version (4.2)** — `GET /RaveWebServices/version/build`
- **TwoHundred Health (4.3)** — `GET /RaveWebServices/twohundred`
- **Cache Flush (4.4)** — `GET /RaveWebServices/webservice.aspx?CacheFlush`
- **Study List (5.1.1)** — `GET /RaveWebServices/studies`
- **Study Metadata (1.5.1.1)** — `GET /RaveWebServices/studies/{StudyOID}/datasets/metadata/regular`
- **Audit Records (1.5.3.4)** — `GET /RaveWebServices/datasets/ClinicalAuditRecords.odm`
- **Subjects (1.5.9)** — `GET /RaveWebServices/studies/{StudyOID}/Subjects`
- **Post ODM Clinical Data (5.4)** — `POST /RaveWebServices/webservice.aspx?PostODMClinicalData`

All responses are **ODM v1.3 XML** and require Basic Auth with a fixed test token.

```
Authorization: Basic VEVTVF9VU0VSOlRFU1RfUEFTU1dPUkQ=
```

Default credentials: `TEST_USER` / `TEST_PASSWORD` (combined as `Basic base64(username:password)`).

## Error Codes (from RWS §1.7.8)

| HTTP | RWS Code | Meaning                |
|------|----------|------------------------|
| 401  | RWS00008 | Unauthorized           |
| 404  | RWS00012 | Study OID not found    |
| 404  | RWS00013 | No subjects found      |
| 500  | RWS00100 | Internal test error    |

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
  "audit": { "user": "raveuser", "field_oids": ["DM.SEX","VS.HR"], "per_page_default": 500 },
  "service": {
    "version": "Rave Web Services Version 1.0.0",
    "build_version": "Build 2025.11.01",
    "two_hundred_status": "200",
    "two_hundred_message": "TwoHundred OK",
    "studies": [
      { "oid": "Mediflex(Prod)", "environment": "Prod" },
      { "oid": "Mediflex_UAT", "environment": "UAT" }
    ],
    "cache_flush_response": "<Success/>",
    "post_clinical_data_response": "<ODM><Success/></ODM>"
  }
}
```

When `dataMode` is `simulator`:
- Informational endpoints (`version`, `version/build`, `twohundred`, `studies`, cache flush, PostODM) read from the simulator `service` config.
- `GET /RaveWebServices/studies/{StudyOID}/Subjects` returns generated subjects.
- `GET /RaveWebServices/datasets/ClinicalAuditRecords.odm` returns generated audit records (supports `StartID`, `PerPage`, `Mode`, `Unicode`, and `FormOID` filters).
- Control endpoints (XML):
  - `POST /simulator/tick` advance one tick
  - `POST /simulator/control/{pause|resume|reset|tick}`
  - `GET /simulator/status` simulator status

Example curls (use values from `config/simulator.json`):
- Version:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/version"`
- Build version:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/version/build"`
- TwoHundred health:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/twohundred"`
- Metadata:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/studies/Mediflex(Prod)/datasets/metadata/regular"`
- Subjects:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/studies/Mediflex(Prod)/Subjects"`
- Audit records:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/datasets/ClinicalAuditRecords.odm?PerPage=5&StartID=1&Mode=Changes&Unicode=Y"`
- Cache flush:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/RaveWebServices/webservice.aspx?CacheFlush"`
- Post ODM clinical data:<br>`curl -u TEST_USER:TEST_PASSWORD -H "Content-Type: application/xml" -d '<ODM><ClinicalData/></ODM>' "http://localhost:3000/RaveWebServices/webservice.aspx?PostODMClinicalData"`
- Manual tick:<br>`curl -u TEST_USER:TEST_PASSWORD -X POST "http://localhost:3000/simulator/tick"`
- Pause/resume/reset:<br>`curl -u TEST_USER:TEST_PASSWORD -X POST "http://localhost:3000/simulator/control/pause"`
- Simulator status:<br>`curl -u TEST_USER:TEST_PASSWORD "http://localhost:3000/simulator/status"`

Simulator behavior
- Auto vs manual: `study.interval_ms` controls auto-ticking (0 disables).
- Batch: `study.batch_percentage` controls subjects processed per tick.
- Time: `study.speed_factor` accelerates timestamps.
- Visits: define `visits.templates` with forms; probabilities `delayed|missed|partial` control outcomes. Delays use `visits.delay_ms` range.
- Subjects/XML: simulator adds `CurrentVisit`, `SiteOID`, `LocationOID`, `SecondarySubjectID`, `VisitStatus`, and optional `DelayedUntil` attributes.
- Metadata/XML: simulator and mock responses include the ODM namespace plus `CreationDateTime` and `SourceSystem` attributes.
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
  - `probabilities`: control outcomes `{ delayed, missed, partial }` (0-1 each).
  - `delay_ms`: `{ min, max }` delay window applied when `delayed` occurs.
- service
  - `version`, `build_version`, `two_hundred_status`, `two_hundred_message`: override XML returned by the informational endpoints.
  - `studies`: list of `{ oid, environment }` rows used by `GET /RaveWebServices/studies`.
  - `cache_flush_response`: raw XML string returned by `GET /RaveWebServices/webservice.aspx?CacheFlush`.
  - `post_clinical_data_response`: raw XML string returned by `POST /RaveWebServices/webservice.aspx?PostODMClinicalData`.
- audit
  - `user`: username placed on generated `<AuditRecord/>` rows.
  - `field_oids`: list of field OIDs to generate changes for.
  - `per_page_default`: default page size when `PerPage` query is omitted.
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

Commented example: JSON does not support comments; see `config/simulator.example.jsonc` for a commented template you can copy to `config/simulator.json` and edit.

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
