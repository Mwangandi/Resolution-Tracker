# Database Setup & Connection Guide

This application supports both **SQLite** (for fast, zero-configuration local development) and **MariaDB / MySQL** (for relational, multi-user, or production deployments) via Prisma ORM and NestJS.

---

## 1. SQLite Setup & Connection Guide (Default)

SQLite is the default embedded file database used by the application. It requires no external database server installation.

### 1.1 Connection URL Format
In SQLite, Prisma uses the `file:` protocol referencing the local database file path:

```env
DATABASE_URL="file:./prisma/dev.db"
```

*Absolute Path Example (e.g. for production or container setups):*
```env
DATABASE_URL="file:/app/applet/prisma/dev.db"
```

### 1.2 Prisma Schema Configuration
In `prisma/schema.prisma`, ensure the datasource is set to `sqlite`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### 1.3 Step-by-Step SQLite Setup
1. **Configure `.env` File**:
   Ensure your `.env` contains:
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   ```
2. **Push Schema & Create Database**:
   Run Prisma DB Push to auto-create `dev.db` and apply all tables:
   ```bash
   npx prisma db push
   ```
3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```
4. **Start Application**:
   ```bash
   npm run dev
   ```
   *Note:* On startup, NestJS will automatically check for existing users and run initial database seeding if the database is empty (creating default roles, categories, and administrator accounts).

### 1.4 Version Control & `.gitignore`
SQLite binary database files should **never** be committed to Git. Ensure `.gitignore` includes:
```gitignore
*.db
*.db-journal
*.db-wal
*.db-shm
dev.db
prisma/*.db
```

---

## 2. MariaDB / MySQL Setup & Connection Guide

Use MariaDB or MySQL for production deployment, multi-container instances, or shared relational database servers.

### 2.1 Prerequisites & Connection URL Format
Ensure you have a running MariaDB or MySQL database server and credentials:
- **Host / IP Address** (e.g. `127.0.0.1` or `45.90.123.75`)
- **Port** (default MariaDB port is `3306`)
- **Database Name** (e.g. `resolutions_db`)
- **Username** (e.g. `root` or `app_user`)
- **Password**

#### Connection String Format:
```env
DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:3306/DATABASE_NAME"
```

*Example:*
```env
DATABASE_URL="mysql://root:SecurePassword123@127.0.0.1:3306/resolutions_db"
```

### 2.2 Step-by-Step MariaDB Setup

#### Step 1: Update Prisma Schema Provider
Open `prisma/schema.prisma` and change the `datasource db` provider to `mysql`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

#### Step 2: Configure `.env` File
Update `.env` with your MariaDB connection string:

```env
DATABASE_URL="mysql://db_user:db_password@127.0.0.1:3306/resolutions_db"
```

#### Step 3: Push Schema to MariaDB
Run Prisma DB Push to apply tables and indexes directly:

```bash
npx prisma db push
```

#### Step 4: Regenerate Prisma Client
Re-generate the TypeScript Prisma Client for the `mysql` provider:

```bash
npx prisma generate
```

#### Step 5: Start or Restart the Server
```bash
npm run dev
```

---

## 3. Environment Variable Examples

### Option A: `.env` for SQLite
```env
# SQLite Connection
DATABASE_URL="file:./prisma/dev.db"

# Integrations
FRAPPE_BASE_URL="http://45.90.123.75:8002"
TILILI_BASE_URL="https://api.tililtech.com/sms/v3/sendsms"
```

### Option B: `.env` for MariaDB
```env
# MariaDB Connection
DATABASE_URL="mysql://root:Secret123@localhost:3306/resolutions_db"

# Integrations
FRAPPE_BASE_URL="http://45.90.123.75:8002"
TILILI_BASE_URL="https://api.tililtech.com/sms/v3/sendsms"
```

---

## 4. Switching & Troubleshooting

### How to Switch Between SQLite and MariaDB
1. Update `provider` in `prisma/schema.prisma` (`"sqlite"` or `"mysql"`).
2. Update `DATABASE_URL` in `.env`.
3. Run `npx prisma db push` and `npx prisma generate`.
4. Restart the development server (`npm run dev`).

### Common Errors & Solutions
1. **"The database disk image is malformed" (SQLite)**:
   - Caused by corrupted database file or improper file lock.
   - Delete `prisma/dev.db` and run `npx prisma db push` to recreate a clean database.
2. **"Unknown database 'resolutions_db'" (MariaDB)**:
   - Create the database first in MariaDB SQL console:
     ```sql
     CREATE DATABASE IF NOT EXISTS resolutions_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
3. **"Access denied for user" (MariaDB)**:
   - Check your username, password, and grant standard privileges (`GRANT ALL PRIVILEGES ON resolutions_db.* TO 'user'@'%';`).

