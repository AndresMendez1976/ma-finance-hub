# Incident Response Runbook

**Product:** MA Finance Hub — Finance SaaS / Standalone Platform
**Last updated:** 2026-03-30

---

## 1. DETECTION

| Source | What to monitor |
|---|---|
| Application logs | 401/403 spikes, 500 errors, unusual patterns |
| Request logger | Anomalous request rates per tenant, unusual paths |
| PostgreSQL logs | Failed auth, RLS violations, unusual queries |
| Health endpoint | `/ready` returning `degraded` |
| Session tracking | Unusual session counts per tenant |
| Audit log | Unexpected `tier_change`, `void`, `set_lock_date` events |

### Alert thresholds (configure in monitoring)

- 500 errors > 5/minute
- 401 errors > 50/minute (potential brute force)
- 403 errors > 20/minute per tenant (potential privilege escalation attempt)
- DB connection pool exhaustion
- Redis connection failure (if REDIS_URL configured)

---

## 2. CLASSIFICATION

| Severity | Criteria | Response time |
|---|---|---|
| P1 — Critical | Data breach, cross-tenant leak, auth bypass, data corruption | Immediate (< 15 min) |
| P2 — High | Service outage, single-tenant data exposure, session hijack | < 1 hour |
| P3 — Medium | Degraded performance, failed tier enforcement, rate limit bypass | < 4 hours |
| P4 — Low | Minor UI issues, non-sensitive config exposure | < 24 hours |

---

## 3. CONTAINMENT

### Immediate actions by severity

**P1 — Critical:**
1. Revoke all active sessions: `DELETE FROM active_sessions` (via migration_user)
2. Rotate INTERNAL_OPS_SECRET / INTERNAL_API_KEY
3. Rotate JWT signing keys
4. Block affected tenant if cross-tenant: set `is_active = false` on tenant
5. Enable maintenance mode (stop application, leave health endpoint up)

**P2 — High:**
1. Revoke affected tenant's sessions
2. Block affected user's membership: `UPDATE tenant_memberships SET is_active = false WHERE user_id = ?`
3. Review audit log for affected tenant

**P3/P4:**
1. Log incident details
2. Monitor for escalation
3. Apply fix in next deployment

### Commands

```bash
# Revoke all sessions for a tenant
docker compose exec postgres psql -U migration_user -d ma_finance_hub \
  -c "UPDATE active_sessions SET revoked_at = now() WHERE tenant_id = <ID>;"

# Disable a user across all tenants
docker compose exec postgres psql -U migration_user -d ma_finance_hub \
  -c "UPDATE users SET is_active = false WHERE id = <USER_ID>;"
  -c "UPDATE active_sessions SET revoked_at = now() WHERE user_id = <USER_ID>;"

# Disable a tenant
docker compose exec postgres psql -U migration_user -d ma_finance_hub \
  -c "UPDATE tenants SET is_active = false WHERE id = <TENANT_ID>;"
```

---

## 4. ERADICATION

1. Identify root cause from audit log + application logs
2. Determine attack vector (auth bypass, SQL injection, RLS failure, etc.)
3. Patch vulnerability
4. Run integration tests to verify fix
5. Deploy patched version

### Audit log query for investigation

```sql
SELECT * FROM audit_log
WHERE tenant_id = <TENANT_ID>
  AND created_at >= '<INCIDENT_START>'
ORDER BY created_at;
```

---

## 5. RECOVERY

1. Verify fix is deployed and tested
2. Re-enable affected tenant/user if safe
3. Issue new JWT signing keys if rotated
4. Notify affected users to re-authenticate
5. Monitor for recurrence (24-48 hours)

### Post-recovery verification

- All integration tests pass
- Health/ready endpoints return `ok`
- Affected tenant can authenticate and operate normally
- Audit log shows no further anomalies

---

## 6. NOTIFICATION

### Internal

| When | Who | How |
|---|---|---|
| P1 detection | Engineering lead + Security | Immediate (Slack/phone) |
| P2 detection | Engineering lead | < 30 min |
| P3/P4 detection | On-call engineer | Next business day |

### External (tenants)

| When | Who | How |
|---|---|---|
| Confirmed data breach | All affected tenants | Email within 72 hours (legal requirement) |
| Service outage > 30 min | All tenants | Status page update |
| Security fix deployed | Affected tenants | Email notification |

### Regulatory

| Jurisdiction | Requirement | Timeline |
|---|---|---|
| Texas (TBPPA) | Notify affected residents | 60 days from discovery |
| General (if PII involved) | Document incident | Immediately |
| HIPAA (healthcare module only) | Breach notification | 60 days |

---

## 7. EVIDENCE PRESERVATION

### What to preserve

- Application logs (request logger output)
- Audit log entries (append-only, DB-enforced)
- PostgreSQL logs
- Redis logs (if applicable)
- Network access logs
- JWT tokens involved (decode payload only, never log secrets)

### How to preserve

1. Snapshot audit_log: `COPY (SELECT * FROM audit_log WHERE created_at >= '<START>') TO '/tmp/incident-audit.csv' WITH CSV HEADER;`
2. Export application logs to secure storage
3. Take DB snapshot if data corruption suspected
4. Record timeline of actions taken

### Retention

- Incident records: 7 years minimum (IRS recordkeeping)
- Audit logs: retain indefinitely (append-only by design)
- Application logs: 90 days minimum

---

## 8. RESPONSIBLE PARTIES

| Role | Responsibility |
|---|---|
| On-call engineer | Detection, initial classification, immediate containment |
| Engineering lead | Escalation, eradication, recovery approval |
| Security lead | Investigation, forensics, regulatory notification |
| Product owner | Customer communication, business impact assessment |
| Legal | Breach notification compliance, regulatory coordination |

---

## 9. POST-INCIDENT

1. Post-mortem within 5 business days
2. Document: timeline, root cause, impact, fix, prevention
3. Update this runbook if new scenarios identified
4. Add integration tests for the failure mode
5. Review and update alert thresholds
