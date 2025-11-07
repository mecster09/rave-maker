# Requirements

## Purpose & Scope
- Provide a strict Fastify + TypeScript mock of Medidata Rave Web Services (RWS) for training, integration tests, and simulator experimentation.
- Serve deterministic ODM v1.3 XML payloads that stay aligned with the RWS documentation set and the YAML spec at `docs/RWS_Core.yaml`.
- Support both static mock data and a configurable simulator so consumers can exercise study metadata, subjects, audit data, and control flows.

## Functional Requirements

### API Transport & Format
- Runtime is Node.js 20 with Fastify 4; the server listens on `0.0.0.0:${PORT|3000}`.
- All public endpoints live under `/RaveWebServices/...` to mirror RWS paths.
- Every response uses `Content-Type: application/xml`; XML payloads must be well-formed ODM v1.3.
- Incoming XML payloads (for example PostODM) are treated as raw strings, no JSON body parsing is enabled.

### Authentication
- Every request must include `Authorization: Basic VEVTVF9VU0VSOlRFU1RfUEFTU1dPUkQ=` (derived from `TEST_USER:TEST_PASSWORD`) unless `config.auth.basic_token` overrides it.
- Missing or mismatched credentials return `401` with `<Response ReasonCode="RWS00008" ErrorClientResponseMessage="Unauthorized"/>`.
- The global Fastify `preHandler` guards all core and simulator endpoints.

### Data Modes
- `mock` mode serves static XML files from `mockData/`.
- `simulator` mode streams generated XML via `src/simulator/` and can persist state between runs.
- Mode selection order: `DATA_MODE`/`SIM_MODE` env vars override everything, `NODE_ENV === test` always forces `mock`, otherwise `config/simulator.json` drives the choice.
- Simulator state persists to `data/simulator-state.json` when `persistence.enabled` is true.

### Core RWS Endpoints

| Section | Method & Path | Behavior / Source |
| --- | --- | --- |
| 4.1 Version | `GET /RaveWebServices/version` | Returns `<Response><Version/></Response>` via simulator or `mockData/version.xml`. |
| 4.2 Build Version | `GET /RaveWebServices/version/build` | Returns build info XML via simulator or `mockData/versionBuild.xml`. |
| 4.3 TwoHundred | `GET /RaveWebServices/twohundred` | Health probe returning status/message XML. |
| 4.4 Cache Flush | `GET /RaveWebServices/webservice.aspx?CacheFlush` | Requires `CacheFlush` flag; returns simulator response or `mockData/cacheFlush.xml`. |
| 5.1.1 Studies | `GET /RaveWebServices/studies` | Lists studies configured in simulator or `mockData/studies.xml`. |
| 1.5.1.1 Metadata | `GET /RaveWebServices/studies/{StudyOID}/datasets/metadata/regular` | Validates StudyOID (defaults to config `study.oid`) and returns metadata XML. |
| 1.5.3.4 Audit Records | `GET /RaveWebServices/datasets/ClinicalAuditRecords.odm` | Supports `PerPage`, `StartID`, `Unicode`, `Mode`, `FormOID`, `StudyOID`; returns simulator output or inline mock audit XML. |
| 1.5.9 Subjects | `GET /RaveWebServices/studies/{StudyOID}/Subjects` | Validates StudyOID then returns subjects XML from simulator or `mockData/subjects.xml`. |
| 5.4 Post ODM Clinical Data | `POST /RaveWebServices/webservice.aspx?PostODMClinicalData` | Requires ODM payload body; responds with simulator acknowledgement or `mockData/postClinicalDataSuccess.xml`. |

### Simulator Control Endpoints
- `POST /simulator/tick`: manually advance one tick.
- `POST /simulator/control/{pause|resume|reset|tick}`: manage simulator lifecycle; returns `<Simulator action="..." status="ok"/>`.
- `GET /simulator/status`: exposes current simulator status and progress snapshot.

### Error Handling
- 400: Missing required query flags (CacheFlush/PostODM) or bodies result in `RWS00020`.
- 401: Auth failures return `RWS00008`.
- 404: Study/subject misses map to `RWS00012` or `RWS00013` via per-route checks and the Fastify notFound handler.
- 500: Unexpected failures use `rwsError('RWS00100', message)`; simulator and route handlers wrap errors consistently.

### Static Data & File Layout
- XML payloads reside in `mockData/*.xml`; add new files per endpoint.
- Helper utilities live in `src/utils/` (`auth.ts`, `errors.ts`, `file.ts`, `config.ts`), and `src/index.ts` wires all routes.
- Simulator logic is centralized in `src/simulator/index.ts`; state persists beneath `data/`.
- API reference materials live in `docs/` (`RWS_Core.yaml`, `api-spec.yaml`, `medidatarwsnet_endpoints.md`, PDF reference).
- `config/simulator.json` controls runtime behavior; `config/simulator.example.jsonc` documents each option.

### Configuration & Simulator Behavior
- `study` block: `oid`, `interval_ms`, `batch_percentage`, `speed_factor`.
- `structure`: `sites`, `subjects_per_site`, optional `site_names`, and `progress_increment`.
- `visits`: template definitions (name, day_offset, form list), `days_between`, probability knobs, and delay windows.
- `audit`: default `user`, `field_oids`, and `per_page_default`.
- `values.rules`: enumerations, numeric ranges, or string patterns for generated field values.
- `service`: overrides for version strings, studies list, CacheFlush response, and PostODM acknowledgement.

## Non-Functional Requirements

### Tech Stack & Build
- TypeScript strict mode targeting ES2020 with ESM output; all runtime relative imports include `.js` extensions.
- Only Fastify (runtime) plus Vitest/tsx/TypeScript dev dependencies are allowed; avoid heavy new dependencies.
- Build with `npm run build` (emits `dist/`); run with `npm start` or `node dist/index.js`.
- `npm run dev` uses `tsx` for local development.
- Docker image builds from `node:20-alpine`, installs production dependencies, runs `npm run build`, and launches `node dist/index.js` on port 3000.

### Testing & Quality
- Vitest lives under `tests/unit/*.test.ts`; use Vitest globals via `test.tsconfig.json`.
- Coverage thresholds must remain high (lines >=90%, functions >=90%, branches >=80%, statements >=90%); enforce via `vitest --coverage`.
- Every new endpoint or helper needs unit tests for:
  - Successful XML responses (payload starts with `<` and sets `application/xml`).
  - Authentication behavior (401 when header missing or invalid).
  - Error handling (missing files, simulator failures, invalid inputs).
- Prefer deterministic fixtures and avoid flakey time-based assertions; simulator ticks can be manual via helpers.
- CI (`.github/workflows/ci.yml`) runs install, build, and tests with coverage gates.

### Logging, Persistence, and Config Management
- Optional logging toggles (`logging.simulator`, `logging.generator`) control console noise; keep them off in tests.
- When `persistence.enabled` is true, simulator state writes to `data/simulator-state.json`; ensure the path is writable in Docker and CI.
- Environment variables: `PORT`, `DATA_MODE`, `SIM_MODE`, `NODE_ENV`, `VITEST`, plus Basic auth overrides via `config.auth`.

### Documentation & Reference
- `README.md`, `simulator.md`, and `docs/` files describe behavior; update them when adding endpoints or config options.
- Follow the root `AGENTS.md` plus any nested overrides when contributing.
- Reference `docs/RWS_Core.yaml` for parameter names, query expectations, and XML samples.

### Deployment & Operations
- Default port is 3000; server binds `0.0.0.0` and respects `PORT` env overrides.
- Docker container must mount or write `data/` if simulator persistence is enabled.
- Mock mode is safe for deterministic tests; simulator mode requires monitoring tick intervals or manual control endpoints.
- Keep Basic auth credentials synchronized between config, docs, and tests to avoid accidental lockouts.
