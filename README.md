# 🧪 Medidata RAVE Study Simulator (V3)

A **TypeScript-based mock API** that simulates live **Medidata RAVE clinical studies** — complete with subjects, sites, forms, visits, queries, and realistic study dynamics.

This version implements **TDD-first development**, **deterministic simulation**, and **automated Jest tests** (unit and API) as specified in **Spec-Kit V3**.

---

## 🚀 Features

- **Config-driven simulation**  
  All study parameters (sites, visits, probabilities, query behavior) are defined via YAML.

- **Deterministic behavior (seeded RNG)**  
  Identical seed + config always yields the same study progression.

- **Express API**  
  Mock RAVE endpoints for subjects, forms, queries, and simulation control.

- **Realistic study behavior**  
  Missed/delayed visits, partial forms, and probabilistic query generation.

- **Full Jest test coverage (unit + API)**  
  Automated via `ts-jest` and `supertest`.

---

## 📂 Project Structure

```
rave-simulator/
├── src/
│   ├── config.ts                 # YAML config loader + schema validation
│   ├── generator.ts              # Data generation engine
│   ├── simulator.ts              # Study orchestrator
│   ├── server.ts                 # Express REST API
│   ├── models.ts                 # Shared model definitions
│   ├── storage/                  # In-memory data store
│   └── utils/                    # Seeded RNG, helpers
│
├── study.config.yaml             # Example study configuration
│
├── tests/
│   ├── unit/                     # Unit tests (Jest)
│   │   ├── configLoader.test.ts
│   │   └── generator.test.ts
│   │   └── storage.test.ts
│   │   └── itils.random.test.ts
│   ├── api/                      # API integration tests (Supertest)
│   │   ├── health.test.ts
│   │   └── endpoints.test.ts
│   └── helpers/
│       └── setupApp.ts           # Utility to bootstrap simulator for tests
│
├── jest.config.cjs               # Jest + ts-jest configuration
├── tsconfig.json                 # TypeScript compiler config
├── package.json                  # NPM project definition
└── README.md                     # This file
```

---

## ⚙️ Configuration

Study behavior is controlled via `study.config.yaml`.

Example excerpt:

```yaml
study:
  id: "study-01"
  name: "Hypertension Simulation"
  seed: 42
  speed_factor: 60
  interval_ms: 5000
  batch_percentage: 10

structure:
  sites: 2
  subjects_per_site: 5

visits:
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
npm run test:unit
```

### Run API (integration) tests only
```bash
npm run test:api
```

### Test coverage report
```bash
npm test -- --coverage
```

Coverage thresholds are enforced globally:
- **Lines:** ≥ 80%  
- **Branches:** ≥ 80%

---

## 🧩 Running the Simulator

You can start the simulator directly:

```bash
npm run dev
```

Then open your browser or use `curl`:

```bash
curl http://localhost:3000/health
```

Example endpoints:
- `GET /api/studies/:id/subjects`
- `GET /api/studies/:id/forms`
- `GET /api/studies/:id/queries`
- `POST /api/control/tick` → advances simulation 1 tick

---

## 🧠 Design Highlights

- **Test-Driven Development (TDD)**  
  Tests define behavior before code is written.
- **Spec Alignment**  
  Fully compliant with **Spec-Kit V3** (`principles.spec.yaml`, `implementation-plan.spec.yaml`, etc.)
- **Deterministic Testing**  
  Uses a custom `SeededRNG` to ensure repeatable data generation.
- **Separation of Concerns**  
  Config loader, generator, storage, and API layers tested independently.

---

## 🧾 License

MIT License © 2025  
Developed for Medidata RAVE simulation, research, and training scenarios.

---

## 🧭 Next Steps

- Add database-backed storage adapter (for persistent simulations)
- Extend API coverage (query endpoints, pagination)
- Add load-testing and performance benchmarking suite
