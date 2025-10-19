# 🧪 Medidata RAVE Mock Study Simulator

A **TypeScript-based mock API** that simulates a live Medidata RAVE clinical study.  
This simulator generates **realistic study data** — including sites, subjects, visits, forms, and queries — and exposes them via a configurable REST API.

It is designed for **testing integrations, analytics pipelines, and downstream systems** that depend on RAVE data streams without needing access to an actual clinical environment.

---

## 🚀 Features

- **Configurable Study Setup**  
  Define number of sites, subjects per site, visits (with forms), and simulation behavior in YAML.

- **Dynamic Data Simulation**  
  Simulates live clinical trial data:
  - Subject creation and randomization  
  - Visit scheduling (planned, missed, delayed)  
  - Form data entry (full or partial forms)  
  - Query creation (missing data or out-of-range values)

- **Configurable Simulation Speed**  
  Control how fast new data appears in “study time” vs real time.

- **Multi-Study Simulation**  
  Run multiple independent study simulations side-by-side.

- **REST API Endpoints**  
  Exposes sites, subjects, visits, forms, and queries over HTTP (mock RAVE API).

---

## 🏗️ Project Structure

```
src/
 ├─ config.ts          # Loads and validates YAML configuration
 ├─ simulator.ts       # Main simulation engine
 ├─ generator.ts       # Generates visits, forms, and queries
 ├─ models.ts          # Type definitions for Study, Site, Subject, Visit, etc.
 ├─ storage/           # Pluggable storage backends (in-memory, file, DB)
 ├─ server.ts          # Express.js API server
 ├─ utils/             # Random data helpers
 ├─ study.config.yaml  # Example study configuration
```

---

## ⚙️ Configuration (YAML)

The simulator is configured via `study.config.yaml`:

```yaml
study:
  id: "study-001"
  name: "Hypertension Study"
  speed_factor: 2
  interval_ms: 10000
  batch_percentage: 10

structure:
  sites: 5
  subjects_per_site: 20

visits:
  - name: "Screening"
    day: 0
    forms: ["Demographics", "Vitals"]
    probability: 1.0
    simulate_missed: false
    simulate_delayed: false
    partial_forms: false

  - name: "Week 4"
    day: 28
    forms: ["Vitals", "Lab Results"]
    probability: 0.85
    simulate_missed: true
    simulate_delayed: true
    max_delay_days: 7
    partial_forms: true
    missing_field_probability: 0.25

queries:
  enabled: true
  missing_data_probability: 0.05
  out_of_range_probability: 0.03
```

---

## 🧩 API Endpoints

| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/api/studies` | GET | List active simulated studies |
| `/api/sites` | GET | Get all sites |
| `/api/subjects` | GET | Get all subjects |
| `/api/forms` | GET | Get form data |
| `/api/queries` | GET | Get open queries |

---

## 🛠️ Installation & Setup

```bash
git clone https://github.com/your-org/medidata-rave-simulator.git
cd medidata-rave-simulator
npm install
npx ts-node src/server.ts
```

---

## 🧬 Running Multiple Studies

```bash
npx ts-node src/server.ts --config study1.config.yaml --port 3000
npx ts-node src/server.ts --config study2.config.yaml --port 3001
```

---

## ☁️ Running in Azure

1. Create a Dockerfile:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]
```

2. Deploy multiple containers with different configs and ports.

---

## 🧾 License

MIT License © 2025 — Designed for simulation and testing purposes only.  
Not affiliated with Medidata or Dassault Systèmes.
