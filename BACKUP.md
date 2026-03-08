# Backup & Recovery Strategy

## Database Backups (PostgreSQL)

In a production environment using PostgreSQL, we recommend the following backup strategy:

### 1. Automated Daily Backups
Use `pg_dump` to create a daily logical backup of the database.

```bash
# Example backup command
pg_dump -U $DB_USER -h $DB_HOST $DB_NAME > backup_$(date +%Y%m%d).sql
```

### 2. Point-in-Time Recovery (PITR)
Enable Write-Ahead Logging (WAL) archiving for continuous backups, allowing recovery to any specific point in time.

### 3. Off-site Storage
Upload backups to a secure, off-site location (e.g., AWS S3, Google Cloud Storage) with versioning and lifecycle policies.

## Recovery Procedures

### 1. Restore from Logical Backup
To restore a specific backup file:

```bash
# Example restore command
psql -U $DB_USER -h $DB_HOST $DB_NAME < backup_20260307.sql
```

### 2. Testing Backups
Perform a trial restoration at least once a month to ensure backup integrity and verify the recovery process.

## Application State
Since this is a stateless application (images are stored via URL/CDN), only the database needs to be backed up.

## Monitoring
Monitor backup success/failure via Sentry or a dedicated monitoring tool.
