# Medidata RAVE Simulator Spec-Kit v2

This folder contains the enhanced v2 Spec-Kit files for the Medidata RAVE Mock Study Simulator project.
They are fully AI-readable and include:

- Behavioral semantics for configuration fields
- Runtime dynamics for simulations
- Enhanced API interaction details
- Traceability and acceptance criteria for tasks
- Phase dependencies and skill requirements for implementation

## Usage

1. Use `config.spec.yaml` to validate `study.config.yaml` structure and behavior.
2. Use `simulation.spec.yaml` to guide the simulator engine implementation (`simulator.ts` / `generator.ts`).
3. Use `api.spec.yaml` to generate or validate REST API endpoints (`server.ts`).
4. Use `implementation-plan.spec.yaml` and `tasks.spec.yaml` to plan work, assign tasks, and track completion.
5. Use `principles.spec.yaml` to enforce architectural and engineering principles.
