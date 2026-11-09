# Apply report watch tables before deploying

The offline SQL upgrades `23ea4b3d5c75` to `24fb5c4e6d86`. It adds two tables,
their constraints and indexes, then updates `alembic_version` in one transaction.
Run it with the database owner only after confirming the deployed revision is
`23ea4b3d5c75`.

```sh
psql "$DATABASE_OWNER_URL" -v ON_ERROR_STOP=1 -f migrations/sql/24fb5c4e6d86_report_watches.sql
psql "$DATABASE_OWNER_URL" -v ON_ERROR_STOP=1 -v runtime_role="$VERIFIED_RUNTIME_ROLE" -f migrations/sql/24fb5c4e6d86_runtime_grants.sql
```

Use the role from the deployed runtime connection. The provisioning script names
`pursuit_preview_app`, but that script alone does not establish the current deployed
role. The grants file takes an identifier parameter so no role is guessed.
These tables use application-generated UUIDs and need no sequence grants.

Verify both tables using the runtime connection before deploying the application.

```sql
SELECT id FROM public.report_watches LIMIT 0;
SELECT id FROM public.watch_alerts LIMIT 0;
SELECT pg_try_advisory_xact_lock(74820153);
```

The application processes overdue weekly checks when its existing report worker
is awake. A sleeping free service does not guarantee a wall-clock schedule.
GET requests only read state. Owners opt in and choose up to five quoted claims
citing at most four distinct sources. Checks make no AI calls. Unavailable
sources retry after six hours. Other checks become due after seven days.
Fetch jobs have a thirty-second process deadline and retain completed receipts.
