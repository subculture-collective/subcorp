# Security Boundary

Subcorp is currently a **single-tenant, trusted-network-only** system.

## Current operating boundary

- Run Subcorp only on a trusted LAN, VPN, or behind reverse-proxy auth.
- Do not expose `/api/ops/*`, `/stage`, or `/sanctum` directly to the public internet.
- `/api/public/*` is the intended public API surface. `/api/ops/*` is internal/admin operational surface unless a route is explicitly documented as public.
- `CRON_SECRET` is service-to-service authentication for cron/worker calls. It is not browser/user authentication.
- The default tenant/workspace IDs are scaffolding for future isolation. They do **not** provide full multi-tenant security.

## Multi-tenant status

No multi-tenant isolation guarantee exists yet. Before enabling public multi-tenant use, every tenant-sensitive resource must carry tenant/workspace identity through auth, persistence, cache keys, queue uniqueness, and API authorization.

If `MULTI_TENANT_ENABLED=true` is ever introduced, missing tenant context must fail closed with 401/403 rather than silently using the default tenant.
