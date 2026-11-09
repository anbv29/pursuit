BEGIN;


CREATE TABLE report_watches (
    id UUID NOT NULL,
    report_id UUID NOT NULL,
    enabled BOOLEAN NOT NULL,
    snapshots JSON NOT NULL,
    generation INTEGER NOT NULL,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    next_check_at TIMESTAMP WITH TIME ZONE,
    lease_token VARCHAR(64),
    lease_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (report_id),
    FOREIGN KEY(report_id) REFERENCES reports (id) ON DELETE CASCADE
);

CREATE INDEX ix_report_watches_due ON report_watches (enabled, next_check_at);

CREATE TABLE watch_alerts (
    id UUID NOT NULL,
    watch_id UUID NOT NULL,
    report_id UUID NOT NULL,
    dedupe_key VARCHAR(64) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id),
    CONSTRAINT uq_watch_alert_receipt UNIQUE (watch_id, dedupe_key),
    FOREIGN KEY(watch_id) REFERENCES report_watches (id) ON DELETE CASCADE,
    FOREIGN KEY(report_id) REFERENCES reports (id) ON DELETE CASCADE
);

CREATE INDEX ix_watch_alert_report_created ON watch_alerts (report_id, created_at);

UPDATE alembic_version SET version_num='24fb5c4e6d86' WHERE alembic_version.version_num = '23ea4b3d5c75';

COMMIT;
