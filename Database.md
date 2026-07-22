# MariaDB / MySQL Setup & Connection Guide

This guide explains how to switch the application's database backend from SQLite to **MariaDB** (or MySQL).

---

## 1. Prerequisites & Connection URL Format

Ensure you have a running MariaDB or MySQL database server and the following credentials:
- **Host / IP Address** (e.g. `127.0.0.1` or `45.90.123.75`)
- **Port** (default MariaDB port is `3306`)
- **Database Name** (e.g. `resolutions_db`)
- **Username** (e.g. `root` or `app_user`)
- **Password**

### Connection String Format
In MariaDB/MySQL, Prisma uses the `mysql` protocol:
```env
DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:3306/DATABASE_NAME"
```

*Example:*
```env
DATABASE_URL="mysql://root:SecurePassword123@127.0.0.1:3306/resolutions_db"
```

---

## 2. Step-by-Step Migration Steps

### Step 1: Update Prisma Schema Provider
Open `prisma/schema.prisma` and update the `datasource db` block to use `mysql`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### Step 2: Configure `.env` File
Update or create your `.env` file at the root of the project with your MariaDB connection string:

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:3306/DATABASE_NAME"
```

### Step 3: Push Schema to MariaDB
Run Prisma DB Push to apply tables and indexes directly to your MariaDB instance:

```bash
npx prisma db push
```

*Alternative (for formal migration tracking):*
```bash
npx prisma migrate dev --name init_mariadb
```

### Step 4: Regenerate Prisma Client
Ensure the Prisma Client TypeScript definitions are re-generated for the MySQL provider:

```bash
npx prisma generate
```

### Step 5: Start or Restart the Server
Restart the development server:

```bash
npm run dev
```

On server startup, NestJS will automatically check for existing users and seed default system categories, roles, and admin data if the database is empty.

---

## 3. Environment Variable Summary

A complete `.env` file when connected to MariaDB:

```env
# MariaDB Database Connection
DATABASE_URL="mysql://db_user:db_password@localhost:3306/resolutions_db"

# Frappe / ERPNext Integration (Optional)
FRAPPE_BASE_URL="http://45.90.123.75:8002"
ACCESS_TOKEN="your_access_token"
API_KEY="your_api_key"
API_SECRET="your_api_secret"

# Tilili SMS Integration (Optional)
TILILI_BASE_URL="https://api.tililtech.com/sms/v3/sendsms"
TILILI_API_KEY="your_sms_api_key"
TILILI_SENDER_ID="T-TAVETAGOV"
```

---

## 4. Troubleshooting & Notes

1. **Database Existence**: Ensure the database (e.g., `resolutions_db`) exists on your MariaDB server before running `npx prisma db push`. You can create it in MariaDB via SQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS resolutions_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. **User Permissions**: Ensure the database user has full schema privileges (`CREATE`, `ALTER`, `DROP`, `SELECT`, `INSERT`, `UPDATE`, `DELETE`) on the target database.
3. **Reverting to SQLite**: To revert back to local SQLite at any time, change `provider = "sqlite"` in `prisma/schema.prisma` and update `DATABASE_URL="file:./prisma/dev.db"` in `.env`.
