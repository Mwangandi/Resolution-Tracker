import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const defaultDbPath = path.resolve(process.cwd(), 'prisma/dev.db');
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || dbUrl === 'forget_it_now' || dbUrl.includes('/app/applet/')) {
      dbUrl = `file:${defaultDbPath}?connection_limit=1`;
    } else if (dbUrl.startsWith('file:') && !dbUrl.includes('connection_limit')) {
      const separator = dbUrl.includes('?') ? '&' : '?';
      dbUrl = `${dbUrl}${separator}connection_limit=1`;
    }
    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
