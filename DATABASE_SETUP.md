# Database Setup

This project supports both **SQLite** (for local development) and **PostgreSQL** (for production).

## Switching Providers

The database provider is controlled by the `DATABASE_PROVIDER` environment variable in your `.env` file.

### 1. Local Development (SQLite)

To use SQLite, set the following in your `.env`:

```env
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./dev.db
```

When you run `npm run dev` or `npm run build`, the system automatically updates `prisma/schema.prisma` to use the `sqlite` provider.

### 2. Production (PostgreSQL)

To use PostgreSQL, set the following in your `.env`:

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@host:port/dbname
```

The system will update `prisma/schema.prisma` to use the `postgresql` provider.

## How it works

A pre-build script (`scripts/prisma-setup.ts`) reads the `DATABASE_PROVIDER` variable and modifies the `datasource db { provider = "..." }` line in `prisma/schema.prisma` before Prisma commands are executed.

## Migrations

- **SQLite**: Use `npx prisma db push` for rapid development.
- **PostgreSQL**: Use `npx prisma migrate dev` to generate migration files.

Note: Migrations are provider-specific. If you switch providers, you may need to clear the `prisma/migrations` folder or handle them separately.
