# PHASE073 Live Broker Hardening Checklist

Status: DRAFT
Scope: tenant integration live broker hardening only

## Authority Gates

- [ ] `PHASE071_TENANT_INTEGRATION_RUNTIME_AUTHORITY=APPROVED`
- [ ] `PHASE072_TENANT_INTEGRATION_LIVE_BROKER_AUTHORITY=APPROVED`
- [ ] `PHASE072_TENANT_INTEGRATION_ENCRYPTION_KEY_AUTHORITY=APPROVED`
- [ ] `PHASE072_BROKER_DOWNSTREAM_CONTRACT=APPROVED`
- [ ] Downstream URL is HTTPS only
- [ ] Downstream HMAC secret is server-only

## Smoke Validation

- [ ] Authorized tenant admin can create integration secret and receives opaque receipt only
- [ ] Authorized tenant admin can rotate integration secret and receives opaque receipt only
- [ ] Authorized tenant admin can revoke integration and receives revoked receipt only
- [ ] Authorized tenant admin can broker-call approved downstream and receives redacted result only
- [ ] Unauthorized role is blocked
- [ ] Missing membership is blocked
- [ ] Missing downstream contract is blocked
- [ ] Missing credential blob is blocked

## Redaction Checks

- [ ] Client response contains no raw secret material
- [ ] Downstream payload contains no raw secret material
- [ ] Audit rows contain no raw secret material
- [ ] Public read surfaces expose metadata/status only
- [ ] Browser console/network response shows opaque receipt/redacted result only

## Monitoring And Alerting

- [ ] `ACCESS_BLOCKED` audit event emitted for blocked broker flow
- [ ] `FAIL` audit event emitted for downstream fetch/reject flow
- [ ] `SECRET_RECEIPT_CONSUMED` audit event emitted for accepted live broker call
- [ ] Alerting watches blocked/fail audit volume
- [ ] Alerting watches repeated downstream rejection

## Rollback Drill

- [ ] Set `PHASE072_TENANT_INTEGRATION_LIVE_BROKER_AUTHORITY` to non-approved value
- [ ] Confirm broker-call fails closed
- [ ] Confirm create/rotate/revoke remain governed by Phase 071 runtime authority
- [ ] Confirm public read-only tenant integration view still loads
- [ ] Confirm no secret material appears in rollback logs

## Exit Criteria

- [ ] Build passes
- [ ] Smoke validation passes
- [ ] Monitoring/audit evidence captured
- [ ] Redaction check passes
- [ ] Rollback drill passes
- [ ] Gatekeeper reviews hardening evidence
