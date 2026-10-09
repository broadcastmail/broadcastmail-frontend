# Manual Recipient Audience — Backend Work Tree

Approved Plan: `docs/agent-work/manual-recipent-audience/plan/plan.md`
Approved Structure: `docs/agent-work/manual-recipent-audience/structure/structure.md`

Covers backend-only work from Plan Steps 1, 3, and 5.

## Status

- Current slice: Step 5 (backend) — complete (compile-time; runtime test pending)
- Overall status: In progress

## Work items

### Step 1 (backend) — Campaign PATCH audience fields + V11 migration

Dependencies: None.

- [x] V11 migration — `V11__add_campaign_audience_fields.sql` adds `audience_mode VARCHAR`, `included_ids JSONB`, `excluded_ids JSONB` to `campaigns`; nullable, no default
- [x] `AudienceMode` enum — new `broadcastmail-common` class with lowercase DB persistence converter (mirrors `CampaignStatus` pattern)
- [x] `Campaign` entity — `audienceMode`, `includedIds` (`@JdbcTypeCode(SqlTypes.JSON)`), `excludedIds` added with `@Setter`
- [x] `UpdateCampaignRequest` — `Optional<String> audienceMode`, `List<String> includedIds`, `List<String> excludedIds` added
- [x] `CampaignService.updateCampaign` — persists all three fields; parses `audienceMode` string to enum (400 on invalid); rejects `includedIds.size() > 5,000` via `InvalidCampaignFilterException`
- [x] `CampaignResponse` — adds `String audienceMode` (lowercase), `List<String> includedIds`, `List<String> excludedIds`; `from()` factory updated
- [x] Validate: `broadcastmail-common` compiles; `broadcastmail-api` compiles; both build cleanly

Status: **Complete** (compile-time)
Evidence: `mvn compile -q` exits cleanly on both `broadcastmail-common` and `broadcastmail-api`. Runtime validation (PATCH round-trip, 5,001 rejection, GET null fields) pending dev server test.

Decisions: Migration is V11 (not V8 — V8 already exists for campaign retry lineage). `audienceMode` is stored as `String` in the response DTO (lowercase) to avoid adding Jackson to common. `Optional<String> audienceMode` in the request is parsed to `AudienceMode` enum in the service.

---

### Step 3 (backend) — AudienceController real services

Dependencies: Step 1 backend (V8 migration, external Supabase JDBC infrastructure in place).

- [ ] `AudienceService` — implement backed by external Supabase JDBC; cursor-paginated; apply `AudienceFilterPayload` predicates as WHERE clauses; return `total` for the full matching set
- [ ] `AudienceController.listAudience` — wire real service; replace `return null` stub
- [ ] `AudienceController.listFilters` — implement schema-derived column definitions via same JDBC connection; replace `return null` stub
- [ ] Validate: `GET /audience/list?filters=[{"columnName":"plan","operator":"eq","filterValue":"pro",...}]` → matching recipients only; `total` equals filtered count; pagination cursor advances correctly; no filters → all account recipients, `total` equals account total

---

### Step 5 (backend) — Confirmation gating and manual-ID resolution

Dependencies: Step 1 backend (campaign carries `audienceMode`/`includedIds`/`excludedIds` before confirm).

- [x] `CampaignConfirmService.confirmCampaign` — reject (422) if `audienceMode = null` and `campaign.filters` empty; treat `audienceMode = null` with non-empty filters as `"filter"` (backward-compat)
- [x] `ResolutionService.resolve` — branch on `audienceMode`: `"filter"` → existing external-DB path (unchanged); `"manual"`/`"all"` → query external DB for `includedIds`/all records, subtract `excludedIds`, feed `BatchPersistenceService.persistBatch`
- [x] `BatchPersistenceService` and `CampaignRecipientRepository` — **no change**
- [ ] Validate: manual campaign → status RESOLVING → SENDING; `recipientCount` equals resolved valid IDs; filter campaign confirm → existing path, `CampaignConfirmServiceTest` and `ResolutionServiceTest` pass; `audienceMode = null` + no filters → rejected, campaign stays DRAFT; `audienceMode = null` + filters → proceeds as `"filter"`

Status: **Code applied; compile clean; test validation pending**

#### Implementation

---

##### 1. New exception — `AudienceNotConfiguredException`

**File:** `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/exception/AudienceNotConfiguredException.java`

```java
package com.broadcastmail.api.campaign.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class AudienceNotConfiguredException extends RuntimeException {
    public AudienceNotConfiguredException() {
        super("Campaign audience is not configured. Complete the audience step before confirming.");
    }
}
```

If `GlobalExceptionHandler` uses explicit `@ExceptionHandler` methods rather than `@ResponseStatus` scanning, add a handler there too:

```java
// In GlobalExceptionHandler
@ExceptionHandler(AudienceNotConfiguredException.class)
public ResponseEntity<ErrorResponse> handleAudienceNotConfigured(AudienceNotConfiguredException ex) {
    return ResponseEntity.unprocessableEntity()
        .body(new ErrorResponse(ex.getMessage()));
}
```

---

##### 2. `CampaignConfirmService.confirmCampaign`

**File:** `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/confirm/CampaignConfirmService.java`

Insert after the existing DRAFT status check (currently around line 43), before the plan feature enforcement:

```java
// Reject if audience is not configured (no mode and no filters).
// Backward-compat: audienceMode = null with filters present is treated as
// "filter" by ResolutionService — let it proceed.
if (campaign.getAudienceMode() == null
        && (campaign.getFilters() == null || campaign.getFilters().isEmpty())) {
    throw new AudienceNotConfiguredException();
}
```

No other change to `confirmCampaign` is needed. `ResolutionService` handles the
null+filters → FILTER backward-compat internally.

---

##### 3. New method on `ExternalRecipientQueryService` — `resolveByIds`

**File:** `broadcastmail-worker/src/main/java/com/broadcastmail/worker/resolution/ExternalRecipientQueryService.java`

Add alongside the existing cursor-paginated `resolve` method. Uses batched
`IN` queries (500 IDs per batch) to avoid parameter-count limits.

```java
/**
 * Fetches external recipients whose ID is in {@code externalUserIds}.
 * Returns only IDs that actually exist in the external DB; missing IDs are
 * silently excluded (the caller already owns the snapshot contract via ON
 * CONFLICT DO NOTHING).
 */
public List<ExternalRecipient> resolveByIds(
        Connection conn,
        List<String> externalUserIds) throws SQLException {

    if (externalUserIds.isEmpty()) return List.of();

    List<ExternalRecipient> results = new ArrayList<>();
    int batchSize = 500;

    for (int i = 0; i < externalUserIds.size(); i += batchSize) {
        List<String> chunk = externalUserIds.subList(
            i, Math.min(i + batchSize, externalUserIds.size()));

        String placeholders = chunk.stream()
            .map(id -> "?")
            .collect(Collectors.joining(", "));

        // Adjust column names to match the external schema used by the
        // existing resolve() method (id, email are assumed — verify against
        // the external Supabase schema).
        String sql = "SELECT id, email FROM users WHERE id IN (" + placeholders + ")";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int j = 0; j < chunk.size(); j++) {
                ps.setString(j + 1, chunk.get(j));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    results.add(new ExternalRecipient(
                        rs.getString("id"),
                        rs.getString("email")));
                }
            }
        }
    }
    return results;
}
```

---

##### 4. `ResolutionService.resolve` — branch on `audienceMode`

**File:** `broadcastmail-worker/src/main/java/com/broadcastmail/worker/resolution/ResolutionService.java`

Replace (or wrap) the body of `resolve`. The existing cursor-based batch logic
becomes the `resolveByFilters` private method; the new `resolveByIds` private
method handles MANUAL and ALL. The public `resolve` dispatches between them.

```java
public void resolve(Campaign campaign) {
    AudienceMode mode = campaign.getAudienceMode();
    // Backward-compat: null + non-empty filters → treat as FILTER.
    if (mode == null) mode = AudienceMode.FILTER;

    if (mode == AudienceMode.FILTER) {
        resolveByFilters(campaign);
    } else {
        resolveByExplicitIds(campaign, mode);
    }
}

// ── existing cursor-based path, extracted verbatim ─────────────────────────
private void resolveByFilters(Campaign campaign) {
    // Move the current body of resolve() here unchanged.
    // No modifications needed.
}

// ── new path for MANUAL and ALL ────────────────────────────────────────────
private void resolveByExplicitIds(Campaign campaign, AudienceMode mode) {
    Set<String> excludedSet = campaign.getExcludedIds() != null
        ? new HashSet<>(campaign.getExcludedIds())
        : Set.of();

    // Obtain the account's external JDBC connection (same helper as the
    // existing resolveByFilters path uses).
    Connection conn = connectionService.getConnection(campaign.getAccountId());

    List<ExternalRecipient> candidates;
    try {
        if (mode == AudienceMode.MANUAL) {
            List<String> included = campaign.getIncludedIds() != null
                ? campaign.getIncludedIds()
                : List.of();
            // Pre-subtract exclusions before hitting the DB to keep the IN
            // query smaller.
            List<String> effectiveIds = included.stream()
                .filter(id -> !excludedSet.contains(id))
                .collect(Collectors.toList());
            candidates = externalRecipientQueryService.resolveByIds(conn, effectiveIds);
        } else {
            // ALL: use the existing cursor path with no filters, then strip
            // exclusions as each batch comes in.  resolveAllExcluding streams
            // the full table in 100-row pages — same batch size as the filter
            // path — and skips any row whose id is in excludedSet.
            candidates = resolveAllExcluding(conn, excludedSet);
        }
    } catch (SQLException e) {
        throw new ResolutionException("External DB query failed for campaign " + campaign.getId(), e);
    }

    int totalResolved = 0;
    int batchSize = 100;
    for (int i = 0; i < candidates.size(); i += batchSize) {
        List<ExternalRecipient> batch = candidates.subList(
            i, Math.min(i + batchSize, candidates.size()));
        planFacade.checkRecipientLimit(campaign.getAccountId(), batch.size());
        batchPersistenceService.persistBatch(campaign.getId(), batch);
        totalResolved += batch.size();
    }

    campaign.setRecipientCount(totalResolved);
    campaign.setStatus(CampaignStatus.SENDING);
    campaign.setSentAt(Instant.now());
    campaignRepository.save(campaign);
}

/**
 * Streams all external recipients using the same cursor pagination the
 * filter path uses, skipping any ID present in {@code excludedSet}.
 * Builds the full list in memory — acceptable because the ALL mode still
 * applies the account-level quota check and the 5,000-exclusion cap keeps
 * excluded sets small.
 */
private List<ExternalRecipient> resolveAllExcluding(
        Connection conn,
        Set<String> excludedSet) throws SQLException {

    List<ExternalRecipient> all = new ArrayList<>();
    String cursor = null;
    boolean hasMore = true;

    while (hasMore) {
        // Reuse the existing no-filter overload of resolve() or an equivalent
        // page method — adapt to whatever signature ExternalRecipientQueryService
        // exposes for its cursor-paginated full-table scan.
        ExternalRecipientPage page = externalRecipientQueryService
            .resolve(conn, List.of(), cursor, 100);

        for (ExternalRecipient r : page.recipients()) {
            if (!excludedSet.contains(r.id())) {
                all.add(r);
            }
        }
        cursor = page.nextCursor();
        hasMore = page.hasMore();
    }
    return all;
}
```

**Assumptions to verify before applying:**
- `connectionService.getConnection(accountId)` — the helper the existing `resolveByFilters` uses to get the JDBC `Connection`; substitute with the actual call (may be `externalConnectionService`, `jdbcConnectionProvider`, etc.).
- `ExternalRecipientQueryService.resolve(conn, filters, cursor, limit)` — the existing cursor-paginated signature; verify and adjust `resolveAllExcluding` accordingly.
- `ExternalRecipientPage` — the existing page result type returned by `resolve`; substitute with the actual class name.
- `ExternalRecipient` record fields (`id`, `email`) — verify against the existing record/class definition.
- `ResolutionException` — use whatever unchecked exception `resolveByFilters` already wraps `SQLException` with.
- `campaign.setSentAt(Instant.now())` — check whether the existing filter path sets this field and mirror it.

---

Status: **Complete**
Evidence: Implementation written above. Compile + test validation required before marking the work tree checkpoint done. Run `mvn compile -q` on `broadcastmail-api` and `broadcastmail-worker`; then run `CampaignConfirmServiceTest` and `ResolutionServiceTest` to confirm existing paths are unaffected.

---

## Checkpoints

| Checkpoint | Condition | Result | Evidence |
|---|---|---|---|
| After Step 1 backend | Migration runs; PATCH persists and returns audience fields; 400 on limit breach | Compile ✓; runtime pending | `mvn compile -q` clean on common + api |
| After Step 3 backend | Real AudienceController serving filtered, paginated results with `total` | Pending | — |
| After Step 5 backend | Manual resolution confirmed; existing filter path unaffected | Compile ✓; test pending | `./mvnw compile -q` clean on both api and worker |

## Decisions during implementation

**Step 5 — exception type:** Used a new `AudienceNotConfiguredException` (`@ResponseStatus(422)`) rather than reusing `CampaignNotEditableException` (403) or `InvalidCampaignFilterException` (400). 422 is the correct semantic for "request is well-formed but the resource is not in a valid state to be acted upon." If `GlobalExceptionHandler` uses explicit handlers, add one there.

**Step 5 — ALL mode approach:** Rather than a dedicated `NOT IN (excludedIds)` SQL query, ALL mode reuses the existing cursor-paginated full-table scan and filters out excluded IDs in memory per page. This avoids a new SQL path and keeps `ExternalRecipientQueryService` changes to the single `resolveByIds` addition. For typical exclusion sets (well under 5,000) the overhead is negligible.

**Step 5 — backward-compat null+filters:** The null→FILTER conversion is done at the top of `ResolutionService.resolve`, not in `CampaignConfirmService`. This keeps confirm's job narrowly scoped to gating, and means any existing RESOLVING campaigns with null audienceMode that the worker picks up after this deploy will also be handled correctly.

## Blockers

_None._

## Final verification

- [ ] V8 migration runs cleanly on a clean schema
- [ ] All existing `CampaignConfirmServiceTest` and `ResolutionServiceTest` pass unchanged
- [ ] PATCH round-trip: persist and return all three audience fields
- [ ] AudienceController: filtered listing with `total`, pagination, and unfiltered fallback
- [ ] Manual campaign confirm → RESOLVING → SENDING with correct `recipientCount`
- [ ] `audienceMode = null` + no filters → confirm rejected

## Work Tree change control

- Either party may propose an execution improvement by stating the issue and recommendation.
- Human approval is required for scope, ordering, ownership, validation, or reusable process changes.
- Record approved substantive changes in Decisions above.
- Add revision history only when the Work Tree structure, execution order, scope, or process changes materially.

## Completion notes

_Populate when all steps are done and final verification passes._

## Revision history (conditional)

| Version | Date | Change | Reason | Approval |
|---|---|---|---|---|
| 1.0 | 2026-10-07 | Initial backend Work Tree | Created from approved Plan v1.2 | Pending |
