import { Module, OnApplicationBootstrap, Logger, Inject } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseConfig } from './database.config';
import { PrismaService } from './prisma.service';
import { FrappeService } from './frappe.service';
import { SmsService } from './sms.service';
import { AuthController } from './auth.controller';
import { DataController } from './data.controller';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [],
  controllers: [AuthController, DataController],
  providers: [
    DatabaseConfig,
    PrismaService,
    FrappeService,
    SmsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    this.logger.log('Bootstrapping system database seeder...');
    try {
      // 1. Seed Users if table is empty or need update
      this.logger.log('Seeding default office-based users...');
      await this.prisma.user.deleteMany({});
      await this.prisma.user.createMany({
        data: [
          {
            email: 'pattersonroge12@gmail.com',
            name: 'Patterson Roge',
            password: '**88Donda',
            phone: '0795752053',
            role: 'System Administrator',
          },
          {
            email: 'gilbert@taitataveta.go.ke',
            name: 'Gilbert',
            password: 'password123', // Static default password for tests
            phone: '254712345678',   // Sample phone for OTP SMS
            role: 'ICT',
          },
          {
            email: 'clerk@taitataveta.go.ke',
            name: 'County Assembly Clerk',
            password: 'password123',
            phone: '254700000001',
            role: 'County Assembly Clerk',
          },
          {
            email: 'jane@taitataveta.go.ke',
            name: 'Clerk Assistant Jane',
            password: 'password123',
            phone: '254722222222',
            role: 'Assistant County Assembly Clerk',
          },
          {
            email: 'committee@taitataveta.go.ke',
            name: 'Committee Clerk',
            password: 'password123',
            phone: '254700000002',
            role: 'Committee Clerk',
          },
          {
            email: 'rehema@taitataveta.go.ke',
            name: 'Rehema',
            password: 'password123',
            phone: '254733333333',
            role: 'County Secretary',
          },
          {
            email: 'sec.assistant@taitataveta.go.ke',
            name: 'Secretary Assistant',
            password: 'password123',
            phone: '254700000003',
            role: "County Secretary's Assistant",
          },
          {
            email: 'health.dir@taitataveta.go.ke',
            name: 'Director Health',
            password: 'password123',
            phone: '254755555555',
            role: 'Director',
            departmentId: 'd1',
            directorateId: 'dir1',
          },
          {
            email: 'health.cecm@taitataveta.go.ke',
            name: 'CECM Health',
            password: 'password123',
            phone: '254700000004',
            role: 'CECM',
            departmentId: 'd1',
          },
          {
            email: 'health.cco@taitataveta.go.ke',
            name: 'CCO Health',
            password: 'password123',
            phone: '254700000005',
            role: 'CCO',
            departmentId: 'd1',
          },
          {
            email: 'chari@taitataveta.go.ke',
            name: 'Chari',
            password: 'password123',
            phone: '254744444444',
            role: 'Assistant Director Liaison',
          },
        ],
      });

      // 2. Seed System Items (Departments, Committees, etc.) if table is empty
      const itemCount = await this.prisma.systemItem.count();
      if (itemCount === 0) {
        this.logger.log('Seeding county assembly system configuration metadata...');
        await this.prisma.systemItem.createMany({
          data: [
            // Departments
            { id: 'd1', type: 'departments', name: 'Health Services' },
            { id: 'd2', type: 'departments', name: 'Agriculture, Livestock & Fisheries' },
            { id: 'd3', type: 'departments', name: 'Water & Environment' },

            // Committees
            { id: 'c1', type: 'committees', name: 'Committee on Health' },
            { id: 'c2', type: 'committees', name: 'Committee on Agriculture' },
            { id: 'c3', type: 'committees', name: 'Committee on Infrastructure' },

            // Directorates
            { id: 'dir1', type: 'directorates', name: 'Public Health', meta: JSON.stringify({ departmentId: 'd1' }) },
            { id: 'dir2', type: 'directorates', name: 'Medical Services', meta: JSON.stringify({ departmentId: 'd1' }) },
            { id: 'dir3', type: 'directorates', name: 'Agriculture', meta: JSON.stringify({ departmentId: 'd2' }) },

            // Doc Categories
            { id: 'cat1', type: 'docCategories', name: 'Resolution' },
            { id: 'cat2', type: 'docCategories', name: 'Hansard' },
            { id: 'cat3', type: 'docCategories', name: 'Report' },
            { id: 'cat4', type: 'docCategories', name: 'Addendum' },

            // Status Categories
            { id: 'st1', type: 'statusCategories', name: 'Draft', meta: JSON.stringify({ badgeClass: 'bg-slate-100 text-slate-800' }) },
            { id: 'st2', type: 'statusCategories', name: 'Pending Approval', meta: JSON.stringify({ badgeClass: 'bg-yellow-100 text-yellow-800' }) },
            { id: 'st3', type: 'statusCategories', name: 'Active', meta: JSON.stringify({ badgeClass: 'bg-blue-100 text-blue-800' }) },
            { id: 'st4', type: 'statusCategories', name: 'Assigned', meta: JSON.stringify({ badgeClass: 'bg-purple-100 text-purple-800' }) },
            { id: 'st5', type: 'statusCategories', name: 'In Progress', meta: JSON.stringify({ badgeClass: 'bg-orange-100 text-orange-800' }) },
            { id: 'st6', type: 'statusCategories', name: 'Completed', meta: JSON.stringify({ badgeClass: 'bg-green-100 text-green-800' }) },
            { id: 'st7', type: 'statusCategories', name: 'Overdue', meta: JSON.stringify({ badgeClass: 'bg-red-100 text-red-800' }) },
          ],
        });
      }

      // 3. Seed Resolutions if empty
      const resCount = await this.prisma.resolution.count();
      if (resCount === 0) {
        this.logger.log('Seeding sample county assembly resolutions...');
        await this.prisma.resolution.create({
          data: {
            id: 'r1',
            referenceNumber: 'TTCA/CS/7/VOL.8/(001)',
            title: 'Upgrading of Voi County Referral Hospital',
            description: 'A resolution to allocate funds and begin the immediate upgrade of facilities at Voi County Referral Hospital to Level 5 status.',
            status: 'In Progress',
            datePassed: '2026-06-15',
            implementationTimeDays: 90,
            dueDate: '2026-09-13',
            departmentId: 'd1',
            directorateId: 'dir2',
            createdBy: 'jane@taitataveta.go.ke',
          },
        });

        await this.prisma.resolution.create({
          data: {
            id: 'r2',
            referenceNumber: 'TTCA/CS/7/VOL.8/(002)',
            title: 'Mwatate Water Pan Desilting',
            description: 'Resolution to desilt the Mwatate water pan to improve water retention during the rainy season.',
            status: 'Pending Approval',
            datePassed: '2026-07-01',
            implementationTimeDays: 45,
            createdBy: 'jane@taitataveta.go.ke',
          },
        });
      }

      this.logger.log('Database verification and seeding completed successfully!');
    } catch (err: any) {
      this.logger.error(`Failed to seed database: ${err.message}`);
    }
  }
}
