# 🧪 Medidata RAVE Web Services (RWS) Simulator  [![🧪 Run Tests](https://github.com/mecster09/rave-maker/actions/workflows/test.yml/badge.svg)](https://github.com/mecster09/rave-maker/actions/workflows/test.yml)

A **TypeScript-based RWS API simulator** that implements the **Medidata RAVE Web Services** REST API with **CDISC ODM 1.3 XML** responses. Perfect for testing integrations with RAVE EDC systems without requiring access to production environments.

This simulator provides **authentic RWS endpoints** compatible with **Medidata.RWS.NET.Standard** and other RWS client libraries, complete with realistic study dynamics, authentication, and ODM-compliant clinical data.

---

## 🚀 Features

### RWS API Implementation
- ✅ **Full CDISC ODM 1.3 XML** - All responses in authentic ODM format
- ✅ **HTTP Basic Authentication** - Configurable user credentials
- ✅ **ProjectName(Environment) naming** - Standard RWS study OID format
- ✅ **Metadata versioning** - Complete study metadata structure
- ✅ **Study Events & Forms** - Hierarchical clinical data (StudyEvent → Form → ItemGroup → Item)

### RWS Endpoints
- `GET /RaveWebServices/version` - Returns RWS version number
- `GET /RaveWebServices/twohundred` - Health check endpoint
- `GET /RaveWebServices/studies` - List all accessible studies
- `GET /RaveWebServices/studies/{project}({env})/subjects` - List subjects in study
- `GET /RaveWebServices/studies/{project}({env})/datasets/regular` - Full clinical dataset
- `GET /RaveWebServices/studies/{project}({env})/subjects/{key}/datasets/regular` - Subject-specific data
- `POST /RaveWebServices/studies/{project}({env})/subjects` - Register new subject (placeholder)

### Simulation Features
- **Config-driven simulation** - All study parameters defined via YAML
- **Deterministic behavior** - Seeded RNG for reproducible study progression
- **Realistic study dynamics** - Missed/delayed visits, partial forms, probabilistic data
- **Fastify-powered** - Modern, fast REST API with comprehensive logging
- **Full test coverage** - 49 automated tests (31 unit + 18 API) via Jest

---

## 📂 Project Structure

```
rave-maker/
├── src/
│   ├── config.ts                 # YAML config loader + validation
│   ├── generator.ts              # ODM clinical data generator
│   ├── simulator.ts              # Study orchestrator
│   ├── server.ts                 # Fastify server with RWS routes
│   ├── index.ts                  # Main entry point
│   ├── models.ts                 # ODM-compliant TypeScript models
│   ├── odm/
│   │   ├── types.ts              # CDISC ODM 1.3 interfaces
│   │   ├── builder.ts            # ODM XML generation
│   │   ├── odmModels.ts          # Study metadata factory
│   │   └── index.ts              # Barrel exports
│   ├── rws/
│   │   ├── auth.ts               # HTTP Basic Authentication
│   │   ├── routes.ts             # RWS endpoint registration
│   │   ├── handlers.ts           # RWS request handlers
│   │   ├── utils.ts              # Study OID parsing utilities
│   │   ├── transformers.ts       # Data format transformers
│   │   └── index.ts              # Barrel exports
│   ├── storage/
│   │   ├── Storage.ts            # Storage interface
│   │   └── InMemoryStorage.ts    # In-memory implementation
│   └── utils/
│       ├── random.ts             # Random number utilities
│       └── seededRandom.ts       # Deterministic RNG
│
├── study.config.yaml             # Study configuration
├── tests/
│   ├── unit/                     # Unit tests (31 tests)
│   │   ├── configLoader.test.ts
│   │   ├── generator.test.ts
│   │   ├── storage.test.ts
│   │   ├── odm.builder.test.ts
│   │   └── utils.random.test.ts
│   ├── api/                      # API tests (18 tests)
│   │   ├── health.test.ts
│   │   ├── endpoints.test.ts
│   │   └── rws.test.ts
│   └── helpers/
│       └── setupApp.ts
│
├── coverage/                     # Test coverage reports
├── docs/                         # Documentation
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## ⚙️ Configuration

Study behavior is controlled via `study.config.yaml`:

```yaml
study:
  project_name: "RaveSim"          # Project name
  environment: "Test"               # Environment (Test, Prod, Dev, etc.)
  name: "RaveSim QA Validation Study"
  description: "Simulated RAVE study for testing RWS integrations"
  metadata_version_oid: "1"        # Metadata version
  seed: 12345                      # Deterministic RNG seed
  speed_factor: 60                 # Time acceleration
  interval_ms: 5000                # Tick interval
  batch_percentage: 25             # % of subjects processed per tick

rws:
  version: "1.18.0"                # RWS version to report
  auth:
    users:
      - username: "testuser"
        password: "testpass"
      - username: "admin"
        password: "admin123"

logging:
  simulator: true                  # Enable simulator logging
  api: true                        # Enable API request/response logging

structure:
  sites: 2                         # Number of sites
  subjects_per_site: 3             # Subjects per site

visits:
  - name: "Screening"
    day: 0
    forms: ["Demographics", "Vitals"]
    probability: 0.95
    simulate_missed: true
  - name: "Baseline"
    day: 7
    forms: ["Vitals", "Labs"]
    probability: 0.9
    simulate_delayed: true
    max_delay_days: 5
  - name: "Visit 1"
    day: 30
    forms: ["Vitals", "Adverse Events"]
    probability: 0.85

queries:
  enabled: false
```

### Study OID Format
The simulator uses the standard RWS naming: **`ProjectName(Environment)`**

Examples:
- `RaveSim(Test)` - Project "RaveSim", environment "Test"
- `Mediflex(Prod)` - Project "Mediflex", environment "Prod"
- `PhaseIII(Dev)` - Project "PhaseIII", environment "Dev"
  - name: "Baseline"
    day: 14
    forms: ["Vitals", "Labs"]
    probability: 0.9
    simulate_missed: true
    simulate_delayed: true
    max_delay_days: 7
    partial_forms: true
    missing_field_probability: 0.2
```

### Logging Options

- **`logging.simulator`** (boolean, optional): Enables detailed logging of data generation activities including:
  - Study initialization
  - Site and subject creation
  - Form generation statistics
  - Missed and delayed visits
  - Defaults to `false` in production

- **`logging.api`** (boolean, optional): Enables HTTP request/response logging for API calls
  - Logs all incoming requests and responses with status codes
  - Defaults to `true` in development (`NODE_ENV !== 'production'`)
  - Uses Fastify's pino-pretty for formatted output

---

## 🧰 Installation

```bash
# Clone or unzip the project
cd rave-simulator

# Install dependencies
npm install
```

---

## 🧪 Running Tests

All tests use **Jest** with **ts-jest** for TypeScript and **Supertest** for API routes.

### Run all tests
```bash
npm test
```

### Run unit tests only
```bash
---

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run unit tests only
```bash
npm run test:unit
```

### Run API tests only
```bash
npm run test:api
```

### Test coverage
```bash
npm test -- --coverage
```

**Test Summary:**
- **Unit Tests:** 31 tests (config, generator, storage, ODM builder, utils)
- **API Tests:** 18 tests (health, RWS endpoints, authentication)
- **Total:** 49 passing tests

---

## 🧩 Running the Simulator

### Development Mode (with hot reload)

```bash
npm run dev
```

Uses `tsx` for instant TypeScript execution with ES module support.

### Production Build

```bash
npm run build
npm start
```

The server starts on `http://localhost:3000` by default.

---

## 📡 RWS API Usage

### Authentication

All protected RWS endpoints require HTTP Basic Authentication. Use credentials configured in `study.config.yaml`:

```bash
# Using curl with authentication
curl -u testuser:testpass http://localhost:3000/RaveWebServices/studies
```

### Example RWS Requests

#### 1. Check RWS Version
```bash
curl http://localhost:3000/RaveWebServices/version
# Response: 1.18.0
```

#### 2. Health Check
```bash
curl http://localhost:3000/RaveWebServices/twohundred
# Response: HTML health check page with 200 OK
```

#### 3. List All Studies
```bash
curl -u testuser:testpass http://localhost:3000/RaveWebServices/studies
```

**Response (ODM XML):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<ODM FileType="Snapshot" FileOID="..." CreationDateTime="2025-10-20T12:00:00.000Z" ...>
  <Study OID="RaveSim(Test)">
    <GlobalVariables>
      <StudyName>RaveSim QA Validation Study</StudyName>
      <StudyDescription>Simulated RAVE study for testing RWS integrations</StudyDescription>
    </GlobalVariables>
  </Study>
</ODM>
```

#### 4. List Subjects in Study
```bash
curl -u testuser:testpass \
  http://localhost:3000/RaveWebServices/studies/RaveSim(Test)/subjects
```

**Response (ODM XML):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<ODM ...>
  <ClinicalData StudyOID="RaveSim(Test)" MetaDataVersionOID="1">
    <SubjectData SubjectKey="SUBJ-SITE-1-001"/>
    <SubjectData SubjectKey="SUBJ-SITE-1-002"/>
    <SubjectData SubjectKey="SUBJ-SITE-1-003"/>
    ...
  </ClinicalData>
</ODM>
```

#### 5. Get Full Clinical Dataset
```bash
curl -u testuser:testpass \
  http://localhost:3000/RaveWebServices/studies/RaveSim(Test)/datasets/regular
```

**Response:** Complete ODM XML with all study events, forms, item groups, and item data for all subjects.

#### 6. Get Clinical Data for Specific Subject
```bash
curl -u testuser:testpass \
  http://localhost:3000/RaveWebServices/studies/RaveSim(Test)/subjects/SUBJ-SITE-1-001/datasets/regular
```

#### 7. Filter by Form OID
```bash
curl -u testuser:testpass \
  "http://localhost:3000/RaveWebServices/studies/RaveSim(Test)/datasets/regular?formOid=VITALS"
```

### Control Endpoints (Simulation)

These endpoints don't require authentication:

```bash
# Health check
curl http://localhost:3000/health

# Advance simulation by one tick
curl -X POST http://localhost:3000/api/control/tick
```

### Using with Medidata.RWS.NET.Standard

```csharp
using Medidata.RWS.NET.Standard;

var client = new RWSClient(
    domain: "http://localhost:3000",
    username: "testuser",
    password: "testpass"
);

// Get all studies
var studies = await client.GetStudies();

// Get subjects for a study
var subjects = await client.GetSubjects("RaveSim(Test)");

// Get clinical data
var clinicalData = await client.GetClinicalData("RaveSim(Test)");
```

### Logging Output

With logging enabled in `study.config.yaml`, you'll see:

```
[SIMULATOR] Initializing study: RaveSim QA Validation Study (ID: TEST-STUDY-001)
[SIMULATOR] Configuration: 4 visits, 2 sites, 3 subjects/site
[GENERATOR] Initialized with seed: 12345
[GENERATOR] Created 2 sites
[GENERATOR] Created 6 subjects
[SIMULATOR] Seeded 6 subjects across 2 sites
[API] GET /health - 200
[API] POST /api/control/tick - 200
[GENERATOR] Processing 1 subjects (25% of 6 total)
[GENERATOR] Created 8 forms, 2 visits missed, 1 visits delayed
[SIMULATOR] Tick completed: 8 new forms created (total: 8)
```

---

## 🧠 Design Highlights

- **Test-Driven Development (TDD)**  
  Tests define behavior before code is written.
- **Modern Tech Stack**  
  Fastify for speed, tsx for development, pino-pretty for beautiful logs.
- **Deterministic Testing**  
  Uses a custom `SeededRNG` to ensure repeatable data generation.
- **Separation of Concerns**  
  Config loader, generator, storage, and API layers tested independently.
- **ES Modules Throughout**  
  Pure ESM with proper TypeScript configuration and Jest support.
- **Configurable Logging**  
  Granular control over simulator and API logging for debugging and monitoring.

---

## 🧾 License

MIT License © 2025  
Developed for Medidata RAVE simulation, research, and training scenarios.

---

## 🧭 Next Steps

- Add database-backed storage adapter (for persistent simulations)
- Extend API coverage (query endpoints, pagination)
- Add load-testing and performance benchmarking suite
