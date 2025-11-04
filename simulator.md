## ⚙️ Simulator Configuration

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


## ⚡ Simulation Control

The simulator generates clinical data progressively over time. You can control this behavior through configuration and manual control.

### Automatic Simulation (Continuous)

When you start the simulator, it automatically generates new clinical data at regular intervals:

```yaml
study:
  interval_ms: 1500        # Generate data every 1.5 seconds
  batch_percentage: 25     # Process 25% of subjects per tick
  speed_factor: 1.0        # Time acceleration multiplier
```

**Configuration Parameters:**

#### `interval_ms` (milliseconds)
Controls how often the simulator generates new data.
- `1000` = Every 1 second (fast, good for testing)
- `5000` = Every 5 seconds (moderate, realistic)
- `60000` = Every 1 minute (slow, production-like)

**Example:**
```yaml
interval_ms: 1500  # Tick every 1.5 seconds
```

With this setting, the simulator will:
1. Process subjects every 1.5 seconds
2. Generate new visit data, forms, and queries
3. Log progress (if `logging.simulator: true`)

#### `batch_percentage` (0-100)
Controls what percentage of subjects are processed each tick.
- `10` = Process 10% of subjects per tick (slow progression)
- `25` = Process 25% of subjects per tick (balanced)
- `100` = Process all subjects per tick (fast, generate everything quickly)

**Example:**
```yaml
structure:
  sites: 2
  subjects_per_site: 3     # Total: 6 subjects
batch_percentage: 25       # Process ~1-2 subjects per tick
```

#### `speed_factor` (multiplier)
Accelerates time for timestamps in generated data. Affects the `lastUpdated` timestamp on forms.
- `1.0` = Real-time (1 second = 1 second)
- `60.0` = 1 minute per second (fast-forward time)
- `0.1` = Slow motion (10 seconds = 1 second)

**Example:**
```yaml
speed_factor: 60.0  # Each second represents 1 minute of study time
```

This is useful for simulating long-duration studies quickly.

### Manual Simulation (Step-by-Step)

You can disable automatic ticking and manually advance the simulation:

```yaml
study:
  interval_ms: 0  # Disable automatic ticking (set to 0 or very large number)
```

Then advance manually via API:

```bash
# Advance simulation by one tick
curl -X POST http://localhost:3000/simulator/tick

# Response: { "status": "advanced" }
```

**Each manual tick:**
1. Selects `batch_percentage` of subjects
2. Processes all configured visits for those subjects
3. Generates forms with realistic data
4. Applies visit probabilities (missed, delayed, partial)
5. Creates queries (if enabled)

### Monitoring Simulation Progress

With `logging.simulator: true`, you'll see detailed progress:

```bash
[SIMULATOR] Initializing study: RaveSim QA Validation Study (OID: RaveSim(Test))
[SIMULATOR] Configuration: 3 visits, 2 sites, 3 subjects/site
[GENERATOR] Created 2 sites
[GENERATOR] Created 6 subjects
[SIMULATOR] Seeded 6 subjects across 2 sites

# Each tick shows:
[GENERATOR] Processing 1 subjects (25% of 6 total)
[GENERATOR] Created 4 forms, 1 visits missed, 1 visits delayed
[SIMULATOR] Tick completed: 4 new forms created (total: 4)

[GENERATOR] Processing 2 subjects (25% of 6 total)
[GENERATOR] Created 6 forms, 0 visits missed, 2 visits delayed
[SIMULATOR] Tick completed: 6 new forms created (total: 10)
```

### Typical Simulation Workflow

**Fast Testing (Generate data quickly):**
```yaml
interval_ms: 1000      # Tick every second
batch_percentage: 100  # Process all subjects each tick
speed_factor: 1.0      # Normal time
```
→ All clinical data generated within seconds

**Realistic Simulation (Mimic actual study pace):**
```yaml
interval_ms: 60000     # Tick every minute
batch_percentage: 10   # Process 10% per tick
speed_factor: 60.0     # 1 hour per minute
```
→ Data generates gradually over time

**Manual Control (For debugging/testing):**
```yaml
interval_ms: 0         # No automatic ticking
batch_percentage: 25   # Moderate batch size
```
→ Call `/simulator/control/tick` whenever you want new data
