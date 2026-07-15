import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from './prisma.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const { method, path, headers } = request;

    // Only intercept requests targeting /api
    if (!path.startsWith('/api')) {
      return next.handle();
    }

    // Skip explicit audit logging route to prevent double logging
    if (path === '/api/audit' && method === 'POST') {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async () => {
          try {
            const userId = (headers['x-user-id'] as string) || 'system';
            const userName = (headers['x-user-name'] as string) || 'System / Unauthenticated';
            const userRole = (headers['x-user-role'] as string) || 'System';

            let action = 'View';
            if (method === 'POST') action = 'Create';
            if (method === 'PUT') action = 'Edit';
            if (method === 'DELETE') action = 'Delete';

            let entityType = 'System';
            if (path.includes('/resolutions')) {
              entityType = 'Resolution';
            } else if (path.includes('/users')) {
              entityType = 'User';
            } else if (path.includes('/auth')) {
              entityType = 'System';
              if (path.includes('login')) action = 'Login';
            }

            let details = `Accessed API: ${method} ${path}`;
            if (path.includes('login')) {
              details = `User logged in via ${path}`;
            } else if (path.includes('send-otp')) {
              details = `OTP requested for email`;
            } else if (path === '/api/data') {
              details = `Fetched system metadata and dashboard lists`;
            } else if (path.includes('/updates')) {
              details = `Modified executive implementation update: ${path}`;
            } else if (path.includes('/comments')) {
              details = `Modified comments: ${path}`;
            } else if (path.includes('/documents')) {
              details = `Modified document attachments: ${path}`;
            }

            // Save to database
            await this.prisma.auditLog.create({
              data: {
                userId,
                userName,
                userRole,
                action,
                entityType,
                entityId: path.split('/').pop() || null,
                details,
                apiEndpoint: path,
                apiMethod: method,
              },
            });
          } catch (e) {
            console.error('[AUDIT INTERCEPTOR] Error logging audit record:', e);
          }
        },
      }),
    );
  }
}
