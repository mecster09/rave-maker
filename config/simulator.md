# Simulator Configuration

This guide explains every field in `config/simulator.json` and how each setting changes the Medidata RWS simulator. All values are plain JSON (no comments). For a commented reference copy `config/simulator.example.jsonc`, remove the comments, and save it as `config/simulator.json`.

> **Hot reload:** Changes are read at process start. Restart `npm run dev` or the Docker container after edits.

## Top-Level Keys

| Key | Type | Purpose |
| --- | --- | --- |
| `dataMode` | `'mock' \\| 'simulator'` | Chooses static XML fixtures (`mock`) or generated data (`simulator`). Env vars `DATA_MODE`/`SIM_MODE` override the file. Tests always force `mock`. |
| `study` | object | Controls the primary study OID and simulator pacing (`interval_ms`, `batch_percentage`, `speed_factor`). |
| `auth` | object | Sets the username/password that get folded into the Basic token. Leave blank to keep defaults. |
| `persistence` | object | Enables saving state to disk (or another adapter) so subjects resume where they left off. |
| `structure` | object | Describes how many sites/subjects exist plus per-tick progress increments and optional friendly site names. |
| `logging` | object | Toggles simulator and generator console logs. |
| `visits` | object | Defines the visit schedule, per-visit forms, outcome probabilities, and delay windows. |
| `audit` | object | Controls who appears in audit records and which FieldOIDs change. |
| `values` | object | Field-level rules for random data generation. |
| `service` | object | Optional overrides for version/build strings, studies list, cache flush, and PostODM responses. |

## Field Reference

### `study`
- `oid` (string): default StudyOID used for metadata, subjects, audits.
- `interval_ms` (number): auto-tick interval. `0` disables auto ticks (use `/simulator/tick`).
- `batch_percentage` (0-100): percent of subjects processed each tick.
- `speed_factor` (number): multiplies the system clock when stamping audit timestamps. Use this when you shorten `interval_ms` but still want “day” length timestamps.

### `auth`
- `username`, `password`: raw credentials. The loader derives the Basic header (`Basic base64(username:password)`).
- `basic_token` (optional): override the computed header entirely if you need a prebuilt token.

### `persistence`
- `enabled` (bool): when `true`, simulator subjects/audits are saved after each tick.
- `state_file` (string): path (relative to repo) for the JSON snapshot. In read-only environments, point this to an external adapter or leave persistence disabled.
- `fresh_seed_on_start` (bool): ignore any saved state on the next boot and reseed from scratch.

### `structure`
- `sites` (number): count of sites (001, 002, ...).
- `subjects_per_site` (number): subjects per site. Total subjects = `sites * subjects_per_site`.
- `progress_increment` (number): percentage added to `Subject.Progress` each time the subject is processed. Once progress hits 100 the subject may flip to `Inactive`.
- `site_names` (string[]): optional friendly names. If provided, they appear as `SiteName` attributes in Subjects XML.

### `logging`
- `simulator`: enables `[SIMULATOR] ...` startup/persistence/tick logs.
- `generator`: adds `[GENERATOR]` summaries each tick (subjects processed + audits created).

### `visits`
- `templates` (array): ordered visit plan. Each template needs:
  - `name`: displayed in metadata and subjects.
  - `day_offset`: descriptive planned day (used in metadata; not a scheduler).
  - `forms`: array of `{ oid, name }` entries; these determine which forms generate audit activity.
- `days_between`: convenience entry. When provided, the loader auto-fills `day_offset` gaps if you leave them blank.
- `probabilities`: outcome weights applied each tick per subject:
  - `delayed`: probability a subject is delayed (visit postponed until delay window elapses).
  - `missed`: probability a subject skips the visit entirely.
  - `partial`: probability only half of the visit’s forms are emitted (VisitStatus becomes `Partial`).
- `delay_ms`: `{ min, max }` bounds for how long a delayed visit waits before resuming. Units are milliseconds.

### `audit`
- `user`: username stamped on each `<AuditRecord/>`.
- `field_oids`: list of FieldOIDs where changes occur. Per visit, fields matching the form prefix are preferred; otherwise the simulator falls back to the entire list.
- `per_page_default`: default `PerPage` size when `/datasets/ClinicalAuditRecords.odm` is called without one.

### `values`
`values.rules` map FieldOID -> rule:
- `type: 'enum'`: cycles deterministically through the provided `enum` list.
- `type: 'number'`: picks an integer between `range.min` and `range.max`.
- `type: 'string'`: uses `pattern` with `{n}` placeholder incremented each time (e.g., `"SUBJ-{n}"`).
If no rule exists, defaults include toggling `DM.SEX` and simple numeric flips.

### `service`
- `version`, `build_version`, `two_hundred_status`, `two_hundred_message`: values returned by the version/twohundred endpoints.
- `studies`: array of `{ oid, environment }` displayed by `GET /RaveWebServices/studies`.
- `cache_flush_response`: literal XML returned by `/webservice.aspx?CacheFlush`.
- `post_clinical_data_response`: literal XML returned by `POST ...?PostODMClinicalData`.

## Example Configurations

### 1. Real-time Mock (default pace)
```json
{
  "dataMode": "simulator",
  "study": { "oid": "Mediflex(Prod)", "interval_ms": 1500, "batch_percentage": 25, "speed_factor": 1 },
  "structure": { "sites": 2, "subjects_per_site": 10, "progress_increment": 10 },
  "visits": {
    "templates": [
      { "name": "Screen", "day_offset": 0, "forms": [{ "oid": "DM", "name": "Demographics" }] },
      { "name": "Visit 1", "day_offset": 14, "forms": [{ "oid": "VS", "name": "Vitals" }] }
    ],
    "probabilities": { "missed": 0.05, "delayed": 0.1, "partial": 0.2 },
    "delay_ms": { "min": 3600000, "max": 86400000 }
  },
  "audit": { "user": "raveuser", "field_oids": ["DM.SEX", "VS.HR"], "per_page_default": 500 },
  "values": {
    "rules": {
      "DM.SEX": { "type": "enum", "enum": ["M", "F"] },
      "VS.HR": { "type": "number", "range": { "min": 55, "max": 110 } }
    }
  }
}
```

### 2. Accelerated “Day per Minute” Sandbox
```json
{
  "dataMode": "simulator",
  "study": {
    "oid": "Mediflex(Prod)",
    "interval_ms": 60000,
    "batch_percentage": 20,
    "speed_factor": 1440
  },
  "visits": {
    "templates": [
      { "name": "Baseline", "day_offset": 0, "forms": [{ "oid": "DM", "name": "Demographics" }] },
      { "name": "Week 1", "day_offset": 7, "forms": [{ "oid": "VS", "name": "Vitals" }, { "oid": "LB", "name": "Labs" }] }
    ],
    "probabilities": { "missed": 0.02, "delayed": 0.08, "partial": 0.1 },
    "delay_ms": { "min": 60000, "max": 300000 }
  }
}
```
This runs a tick every minute but stamps audit records as if a full day passed between ticks (`speed_factor` = 24hr / 1min).

### 3. Deterministic Mock Mode with Persistence Disabled
```json
{
  "dataMode": "mock",
  "study": { "oid": "Mediflex(Prod)", "interval_ms": 0, "batch_percentage": 100, "speed_factor": 1 },
  "persistence": { "enabled": false },
  "structure": { "sites": 1, "subjects_per_site": 5 },
  "visits": { "templates": [{ "name": "Screen", "day_offset": 0, "forms": [{ "oid": "DM", "name": "Demographics" }] }] }
}
```
Even in `mock` mode the server uses the auth/service settings here, while the payloads come from `mockData/*.xml`.

## Tips
- Keep probabilities between 0 and 1. The simulator checks `missed` first, then `delayed`, then `partial`.
- Set `interval_ms` to `0` when running in CI to avoid background timers; drive ticks manually via `/simulator/tick`.
- If `state_file` points to an unwritable location, disable persistence or swap in a non-disk adapter (see `config.ts`).
- Update `service.studies` whenever you change the primary `study.oid` so `/studies` stays in sync with metadata.
