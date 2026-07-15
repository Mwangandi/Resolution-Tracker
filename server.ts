import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config({ override: true });

// Ensure DATABASE_URL is set correctly for SQLite, bypassing any dummy/empty values injected by the container platform
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'forget_it_now') {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}


import express from 'express';
import path from 'path';
import fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createServer as createViteServer } from 'vite';
import { AppModule } from './src/server/app.module';
import { ExceptionFilter, Catch, ArgumentsHost, NotFoundException } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(NotFoundException)
class ViteAndStaticFilter implements ExceptionFilter {
  constructor(private readonly vite: any, private readonly distPath: string) {}

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If it's an API request, let NestJS return the standard 404 response
    if (request.path.startsWith('/api')) {
      const status = exception.getStatus();
      response.status(status).json(exception.getResponse());
      return;
    }

    // Otherwise, handle with Vite or serve static files
    if (process.env.NODE_ENV !== 'production') {
      if (this.vite) {
        this.vite.middlewares(request, response, (err: any) => {
          if (err) {
            response.status(500).send(err.message);
          } else {
            response.status(404).send('Not Found');
          }
        });
      } else {
        response.status(404).send('Vite not initialized');
      }
    } else {
      const filePath = path.join(this.distPath, request.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        response.sendFile(filePath);
      } else {
        response.sendFile(path.join(this.distPath, 'index.html'));
      }
    }
  }
}

async function bootstrap() {
  const expressApp = express();
  
  // Wrap expressApp in a Proxy to intercept and return undefined for the deprecated 'router' getter.
  // This avoids "TypeError: Cannot redefine property: router" or "app.router is deprecated" error.
  const appProxy = new Proxy(expressApp, {
    get(target, prop, receiver) {
      if (prop === 'router') {
        return undefined;
      }
      return Reflect.get(target, prop, receiver);
    }
  });

  // Basic middlewares
  appProxy.use(express.json());
  appProxy.use(express.urlencoded({ extended: true }));

  const distPath = path.join(process.cwd(), 'dist');
  let vite: any = null;

  // Initialize Vite in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SERVER] Running in DEVELOPMENT mode. Initializing Vite...');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // Create NestJS application inside our Express server
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(appProxy),
  );

  // Register Vite and static assets exception filter
  nestApp.useGlobalFilters(new ViteAndStaticFilter(vite, distPath));

  // Initialize the NestJS framework (registers controllers, runs bootstrap, seeds DB)
  await nestApp.init();

  const PORT = 3000;

  // Start listening
  appProxy.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] NestJS + Vite Full-Stack engine is listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
