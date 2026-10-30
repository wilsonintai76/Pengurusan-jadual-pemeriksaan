# PBAC Plan: Government Movable Asset Inspection Webapp

## 1. Core principle

Do not make "role" a fixed attribute of a user. Separate:

- **Roles** = capabilities (what a user may do in general)
- **Context restrictions** = data-driven rules (e.g. "cannot inspect assets under own supervision"), evaluated at action time, never baked into the role

One staff member can hold several roles at once (Penolong Pegawai Aset Jabatan, Penyelia Lokasi, Pemeriksa). Each is a separate assignment row.

## 2. Data model

| Table | Key fields |
|---|---|
| `user` | id, department_id, ... |
| `role` | PENOLONG_PEGAWAI_ASET, PENYELIA_LOKASI, PEMERIKSA, ADMIN |
| `role_assignment` | user_id, role_id, scope_type, scope_id, valid_from, valid_to (nullable) |
| `asset` | id, department_id, location_id, ... |
| `location` | id, department_id (supervisor via role_assignment) |
| `inspection_cycle` | id, mode (SEHALA / TIMBAL_BALIK), start, end |
| `inspection_assignment` | cycle_id, inspector_id, asset/target scope (generated per cycle) |
| `audit_log` | user_id, action, acted_as_role, decision, reason, timestamp |

### Role tenure

| Role | valid_from | valid_to |
|---|---|---|
| PEMERIKSA | appointment date | valid_from + 2 years |
| PENYELIA_LOKASI | appointment date | NULL (until terminated) |
| PENOLONG_PEGAWAI_ASET | appointment date | NULL (until terminated) |

Uniform "active" check for every role:

```sql
valid_from <= :date AND (valid_to IS NULL OR valid_to >= :date)
```

Use `:date` = inspection date, not `now()`, so historical records can be re-verified.

## 3. Inspection eligibility rule

A user may inspect asset A in cycle C only if ALL are true:

1. Holds an active PEMERIKSA assignment on the inspection date.
2. Asset A is in that inspector's `inspection_assignment` for cycle C.
3. Conflict of interest: user is NOT the active Penyelia Lokasi of A's location and NOT the active Penolong Pegawai Aset of A's department.
4. TIMBAL_BALIK mode: inspector's department/location differs from the asset's. SEHALA mode: rules 1-3 suffice.

```ts
function canInspect(user, asset, cycle, date) {
  const active = a => a.validFrom <= date && (!a.validTo || a.validTo >= date);

  const isInspector = user.assignments.some(a =>
    a.role === 'PEMERIKSA' && active(a));
  if (!isInspector) return false;

  const supervises = user.assignments.some(a =>
    a.role === 'PENYELIA_LOKASI' && a.scopeId === asset.locationId && active(a));
  const isDeptAssetOfficer = user.assignments.some(a =>
    a.role === 'PENOLONG_PEGAWAI_ASET' && a.scopeId === asset.departmentId && active(a));
  if (supervises || isDeptAssetOfficer) return false;

  if (cycle.mode === 'TIMBAL_BALIK' && user.departmentId === asset.departmentId)
    return false;

  return isAssigned(user.id, asset.id, cycle.id);
}
```

## 4. Eligible-asset query (filtering in the database)

```sql
SELECT a.id FROM asset a
WHERE a.id IN (/* assets in the cycle */)
AND NOT EXISTS (
  SELECT 1 FROM role_assignment r
  WHERE r.user_id = :inspector
    AND r.role IN ('PENYELIA_LOKASI','PENOLONG_PEGAWAI_ASET')
    AND ((r.role = 'PENYELIA_LOKASI' AND r.scope_id = a.location_id)
      OR (r.role = 'PENOLONG_PEGAWAI_ASET' AND r.scope_id = a.department_id))
    AND r.valid_from <= :date
    AND (r.valid_to IS NULL OR r.valid_to >= :date)
);
```

Add an inspector/asset department filter for TIMBAL_BALIK mode.

## 5. Assigning roles (admin workflow)

- Admin adds a new `role_assignment` row per role; never overwrite an existing role. One person may have 3 rows at the same time.
- Roles are scoped (e.g. Penyelia for Makmal X) and time-bound where applicable.
- Inspector-to-asset assignments are system-generated per cycle: list eligible assets (rules above), then admin confirms. Not freely chosen.

## 6. Effects of the 2-year inspector tenure

1. **Tenure and cycles are separate.** One appointment spans several cycles. Regenerate `inspection_assignment` every cycle, only for inspectors active on the cycle date. Do not bind assignments directly to the appointment.
2. **Expiry.** Never delete rows; let `valid_to` lapse. Renewal = a new row (keeps history). Notify admin about 60 days before expiry.
3. **Conflicts while tenure is active.** Penyelia/Penolong can change anytime, so an inspector may become supervisor of a location they inspect. Handle in two places:
   - When adding a Penyelia/Penolong role, check whether the person is an active inspector with open assignments in the same scope; if so, reject and force reassignment.
   - At inspection time, `canInspect` re-checks conflict on the date (second line of defence).
4. **Historical conflicts.** Decide policy: may a former supervisor of location X inspect X later? If not, also check expired assignments (for a set number of cycles or permanently).
5. **Reciprocal (timbal balik) mode.** Lock pairings (A inspects B, B inspects A) as a snapshot at cycle start. If an inspector expires or changes department mid-cycle, flag for admin reassignment; do not change silently.

## 7. Safeguards

- Enforce in two places: API (mandatory) and UI filtering (convenience). Never only hide buttons.
- Separation of duties on approval too: inspectors cannot approve/verify their own results; supervisors cannot verify assets they supervise.
- Audit trail: store `acted_as_role` and denial reasons.
- Index `role_assignment` on (user_id, role, valid_from, valid_to).

## 8. Implementation on Cloudflare stack

- `canInspect` as Hono middleware; load the user's assignments once per request.
- Eligible-asset list via a single D1 query with `NOT EXISTS` (filtering in SQL, not application code).

## 9. Suggested build order

1. D1 schema + indexes
2. `role_assignment` admin UI (add/end/renew)
3. `canInspect` middleware + unit tests for conflict, expiry, and both modes
4. Cycle setup: eligible-asset generation + admin confirmation
5. Timbal balik snapshot + reassignment flags
6. Audit log + expiry notifications
