/**
 * Database and Session Management Configuration File.
 * 
 * If you need to migrate from SQLite to PostgreSQL, MariaDB, or MySQL:
 * 1. Change the DATABASE_URL in your .env file.
 * 2. Update the provider inside /prisma/schema.prisma to "postgresql" or "mysql".
 * 3. Run: npx prisma db push
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseConfig {
  // Read DB provider & connection configuration from environment
  public readonly provider = process.env.DATABASE_PROVIDER || 'sqlite'; // 'sqlite' | 'postgresql' | 'mysql' | 'mariadb'
  public readonly url = process.env.DATABASE_URL || 'file:./prisma/dev.db';

  // Frappe settings
  public readonly frappe = {
    baseUrl: process.env.FRAPPE_BASE_URL || 'http://45.90.123.75:8002',
    accessToken: process.env.ACCESS_TOKEN || '723fff1cb66ff449f953fed59762d990387014a2a170627f4969a718034b5876',
    apiKey: process.env.API_KEY || '4368b64a5f1c4ef',
    apiSecret: process.env.API_SECRET || 'baf7d5242bfedd6',
    user: process.env.FRAPPE_USER || 'pattersonroge12@gmail.com',
    pass: process.env.FRAPPE_PASS || '**88Donda',
  };

  // Tilil SMS settings
  public readonly tilili = {
    baseUrl: process.env.TILILI_BASE_URL || 'https://api.tililtech.com/sms/v3/sendsms',
    dlrUrl: process.env.TILILI_DLR_URL || 'https://api.tililtech.com/sms/v3/getdlr',
    apiKey: process.env.TILILI_API_KEY || 'YbdIXnAUWVPu7Ks8QHtopkfRwlEicv3y6z0F9qx5Gj2LmOC4DTJSarN1eZBhMg',
    senderId: process.env.TILILI_SENDER_ID || 'T-TAVETAGOV',
  };
}
