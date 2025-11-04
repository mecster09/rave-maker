# AGENTS Guide - Rave-Maker

Authoritative instructions for AI agents and contributors working in this repository. These rules apply to the entire repo unless a more deeply nested AGENTS.md overrides them.

## Purpose
- Provide a strict, Fastify + TypeScript mock of Medidata Rave Web Services (RWS) with XML outputs for training, testing, and sandboxing.
- Preserve compatibility with RWS docs and examples in `docs/` and the YAML spec in `docs/RWS_Core.yaml`.

## Tech Stack
- Runtime: Node 20, Fastify 4, ESM (`"type": "module"`).
- Language: TypeScript (strict), built to `dist/`.
- Tests: Vitest with high coverage thresholds.
- Docker: Single-stage build running `node dist/index.js`.

## Project Conventions
- ESM only. Use explicit `.js` extensions for runtime relative imports inside `src` where applicable (see `src/index.ts:1` and `src/index.ts:5` etc.).
- All API responses are XML with `content-type: application/xml`.
- Use helpers in `src/utils/`:
  - Auth: `ensureAuthorized` (`src/utils/auth.ts:1`) to validate `Authorization`.
  - Errors: `rwsError`, `escapeXml` (`src/utils/errors.ts:1`).
  - Files: `readXml` (`src/utils/file.ts:1`) for loading static XML.
- Keep endpoints under `/RaveWebServices/...` to mirror RWS paths.
- Mock payloads live in `mockData/*.xml`. Prefer static files over inline strings.

## Auth & Errors
- Auth header must be exactly `Authorization: Basic TEST_TOKEN`.
- Unauth: return `401` with `<Response ReasonCode="RWS00008" ErrorClientResponseMessage="Unauthorized"/>`.
- 404 fallback: use Fastify notFound handler returning RWS-style `<Response/>` (see `src/index.ts:41`).
- 500 errors: use `rwsError('RWS00100', message)` in the error handler and per-route catches.

## Endpoints Implemented
- Metadata: `GET /RaveWebServices/studies/:studyOid/datasets/metadata/regular`
- Audit records: `GET /RaveWebServices/datasets/ClinicalAuditRecords.odm`
- Subjects: `GET /RaveWebServices/studies/:studyOid/Subjects`
- Examples and parameter hints live in `docs/RWS_Core.yaml`.

## Adding An Endpoint (Checklist)
1. Define the endpoint path/method consistent with RWS in `docs/RWS_Core.yaml`.
2. Add a route in `src/index.ts` returning XML with `reply.type('application/xml')`.
3. Place the response in `mockData/<name>.xml` and load with `readXml(...)`.
4. Wrap failures with `rwsError('RWS00100', err.message)` and set `500`.
5. Ensure the global `preHandler` auth still guards the route.
6. Add unit tests under `tests/unit/` covering:
   - Happy path returns XML (starts with `<`).
   - Auth behavior (401 when header missing/invalid).
   - Error behavior when file missing/invalid.
7. Keep coverage thresholds satisfied (see `vitest.config.ts`).

## Testing Guidelines
- Location: `tests/unit/*.test.ts`.
- Use Vitest globals; see imports in existing tests.
- Coverage thresholds (v8): lines 90, functions 90, branches 80, statements 90 (`vitest.config.ts`).
- For new helpers, add focused tests to validate edge cases (e.g., XML escaping).

## File/Module Notes
- `src/index.ts`: Fastify app, global auth hook, routes, notFound + error handlers.
- `src/utils/auth.ts`: Exact token check; supports arrays of headers.
- `src/utils/errors.ts`: Central `<Response/>` formatter + XML escaping.
- `src/utils/file.ts`: Synchronous XML read with minimal validation.
- `mockData/*.xml`: Source of truth for responses; keep well-formed ODM v1.3.
- `docs/`: Reference spec (`RWS_Core.yaml`), PDF, and prompts for agent usage.

## Simulator Config
- Active config: `config/simulator.json` (plain JSON). Use it to switch between `mock` and `simulator` modes and to tune study/sites/visits/audit/value rules.
- Commented template: `config/simulator.example.jsonc` provides inline guidance. Copy to `config/simulator.json` and remove comments.
- README has a full options overview and examples.

## Do/Don't
- Do return `application/xml` for every route; keep payloads strict and deterministic.
- Do escape user/variable content with `escapeXml`.
- Do keep paths and ReasonCodes aligned with RWS examples.
- Don't introduce JSON responses or change content types.
- Don't change the auth token/string without updating tests and docs.
- Don't add wildcard routes that could shadow the existing paths.
- Don't add heavy deps; prefer stdlib + Fastify.

## CI & Docker
- CI (GitHub Actions) runs install/build/tests with coverage.
- Docker image builds from `node:20-alpine`, installs prod deps, builds, and exposes `3000`.

## Pull Request Hygiene
- Keep changes minimal and scoped; update or add unit tests with your changes.
- Update `docs/RWS_Core.yaml` and `README.md` if you add/modify endpoints.
- Verify `npm run build` and `npm test` pass locally before opening PRs.

---
If any instruction in a deeper directory's AGENTS.md conflicts with this file, the deeper file takes precedence for files under its directory.
