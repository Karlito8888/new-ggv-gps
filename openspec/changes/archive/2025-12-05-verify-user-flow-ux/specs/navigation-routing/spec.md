# navigation-routing Delta

## MODIFIED Requirements

### Requirement: Route Protection

Routes SHALL validate required state and redirect appropriately when prerequisites are not met, with minimal delay to maintain user experience fluidity.

#### Scenario: Navigate without GPS redirects

- **WHEN** user directly accesses `/navigate` without GPS permission
- **THEN** the application redirects to `/` within 500ms
- **AND** GPS permission is requested

#### Scenario: Navigate without destination redirects

- **WHEN** user accesses `/navigate` without block/lot parameters (and not in exit mode)
- **THEN** the application redirects to `/welcome` within 500ms
- **AND** a brief "No destination selected" message is shown

#### Scenario: Exit mode bypasses destination requirement

- **WHEN** user accesses `/navigate?exit=true`
- **AND** user has GPS permission
- **THEN** navigation to village exit proceeds without block/lot parameters
- **AND** destination is set to `VILLAGE_EXIT_COORDS`

#### Scenario: Arrived without destination redirects

- **WHEN** user directly accesses `/arrived` without valid destination
- **THEN** the application redirects to `/welcome`
