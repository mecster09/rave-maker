# Task List

- [x] Ensure mock service matches docs/api-spec.yaml endpoints
  - [x] Add/verify routes: /version, /version/build, /twohundred, /webservice.aspx?CacheFlush, /studies, POST /webservice.aspx?PostODMClinicalData
  - [x] Align responses, headers, and error handling with spec and RWS conventions
  - [x] Add or update supporting mock data/utilities required by new routes
- [x] Sync simulator implementation and configuration
  - [x] Review simulator logic for new endpoints and update if needed
  - [x] Extend configuration defaults/options to cover simulator behaviors
  - [ ] Document any simulator config changes in example files/README
- [x] Update automated tests
  - [x] Add unit tests for new/changed routes covering success/auth/error flows
  - [x] Update simulator-related tests as required
  - [x] Run npm test and address coverage gaps
- [ ] Refresh documentation set
  - [ ] Update README with new endpoint details
  - [ ] Cross-check docs/api-spec.yaml, prompts, and other references for consistency
  - [ ] Provide guidance on simulator usage and new configs
