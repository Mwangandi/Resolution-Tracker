import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const defaultDbPath = path.resolve(process.cwd(), 'prisma/dev.db');
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || dbUrl === 'forget_it_now') {
      dbUrl = `file:${defaultDbPath}`;
    }
    if (dbUrl.startsWith('file:') && !dbUrl.includes('connection_limit')) {
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
    try {
      await this.$connect();
      // Execute health check query
      await this.$queryRaw`PRAGMA quick_check;`;

      // Auto-migrate any base64 documents/images in database to Private/files or Private/images
      try {
        const { savePayloadToDisk } = await import('./file-storage.util');
        const docsWithData = await this.document.findMany({
          where: { url: { startsWith: 'data:' } }
        });
        for (const doc of docsWithData) {
          const fname = doc.fileName || doc.name || 'document';
          const newUrl = savePayloadToDisk(doc.url, fname);
          if (newUrl !== doc.url) {
            await this.document.update({
              where: { id: doc.id },
              data: { url: newUrl }
            });
            this.logger.log(`Migrated doc #${doc.id} (${fname}) to ${newUrl}`);
          }
        }
      } catch (migErr: any) {
        this.logger.warn(`Document migration check skipped: ${migErr?.message}`);
      }
    } catch (err: any) {
      if (err?.message?.includes('malformed') || err?.message?.includes('Error code 11')) {
        this.logger.error('SQLite database image is malformed. Auto-repairing database file...');
        await this.$disconnect().catch(() => {});
        
        const dbFilePath = path.resolve(process.cwd(), 'prisma/dev.db');
        if (fs.existsSync(dbFilePath)) {
          fs.unlinkSync(dbFilePath);
        }
        
        try {
          execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
          this.logger.log('Database schema successfully recreated after auto-repair.');
        } catch (pushErr: any) {
          this.logger.error(`Failed to push schema during repair: ${pushErr.message}`);
        }
        await this.$connect();
      } else {
        throw err;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
