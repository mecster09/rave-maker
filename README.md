# 🧩 Rave-Maker

This project simulates the **Medidata Rave Web Services (RWS)** API with **strict XML** outputs, implemented in **Fastify + TypeScript**.  
It supports AI training, integration testing, and developer sandboxing aligned to RWS documentation sections 1.1.2, 1.5.x, and 1.7.x.

## Overview
Implements key RWS endpoints:
1. **Study Metadata (1.5.1.1)** — `GET /studies/{study-oid}/datasets/metadata/regular`
2. **Audit Records (1.5.3.4)** — `GET /datasets/ClinicalAuditRecords.odm`
3. **Subjects (1.5.9)** — `GET /studies/{study-oid}/Subjects`

All responses are **ODM v1.3 XML** and require Basic Auth with a fixed test token.

```
Authorization: Basic TEST_TOKEN
```

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
RWS_Core.yaml     # Normalized YAML specification
README.md
```

## Development
```bash
npm install
npm run dev
npm test
```

## Docker
```bash
docker build -t rws-core-mock .
docker run -p 3000:3000 rws-core-mock
```

## GitHub Actions
Workflow `.github/workflows/ci.yml` automatically:
1. Checks out code
2. Installs deps
3. Builds TS
4. Runs unit tests
