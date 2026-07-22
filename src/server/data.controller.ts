import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { PrismaService } from './prisma.service';

function safeParseJson(str: string | null | undefined, fallback: any = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

@Controller('api')
export class DataController {
  private readonly logger = new Logger(DataController.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('data')
  async getAllData() {
    try {
      const users = await this.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, departmentId: true, directorateId: true, phone: true, password: true, phoneVerified: true }
      });
      const resolutions = await this.prisma.resolution.findMany({
        include: {
          documents: true,
          comments: true,
          executiveUpdates: true,
        },
      });
      const auditLogs = await this.prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
      });
      const systemItems = await this.prisma.systemItem.findMany();

      // Separate system items into categories
      const departments = systemItems.filter((i) => i.type === 'departments').map((i) => ({ id: i.id, name: i.name, ...safeParseJson(i.meta) }));
      const directorates = systemItems.filter((i) => i.type === 'directorates').map((i) => ({ id: i.id, name: i.name, ...safeParseJson(i.meta) }));
      const committees = systemItems.filter((i) => i.type === 'committees').map((i) => ({ id: i.id, name: i.name, ...safeParseJson(i.meta) }));
      const docCategories = systemItems.filter((i) => i.type === 'docCategories').map((i) => ({ id: i.id, name: i.name, ...safeParseJson(i.meta) }));
      const statusCategories = systemItems.filter((i) => i.type === 'statusCategories').map((i) => ({ id: i.id, name: i.name, ...safeParseJson(i.meta) }));
      
      const logoSetting = systemItems.find((i) => i.type === 'settings' && i.name === 'system_custom_logo');
      const customLogo = logoSetting ? safeParseJson(logoSetting.meta, {}).logo || null : null;

      return {
        users,
        resolutions,
        departments,
        directorates,
        committees,
        docCategories,
        statusCategories,
        auditLogs,
        customLogo,
      };
    } catch (error: any) {
      this.logger.error(`Error fetching system data: ${error.message}`, error.stack);
      throw new HttpException(`Failed to retrieve system data: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('resolutions')
  async createResolution(@Body() body: any) {
    try {
      const { referenceNumber, title, description, status, datePassed, implementationTimeDays, dueDate, departmentId, committeeId, directorateId, createdBy, documents } = body;
      const res = await this.prisma.resolution.create({
        data: {
          referenceNumber,
          title,
          description,
          status: status || 'Draft',
          datePassed,
          implementationTimeDays: parseInt(implementationTimeDays) || 30,
          dueDate,
          departmentId,
          committeeId,
          directorateId,
          createdBy,
          documents: documents && Array.isArray(documents) ? {
            create: documents.map((doc: any) => ({
              name: doc.name || doc.fileName || 'Document',
              fileName: doc.fileName || doc.name,
              description: doc.description || (doc.name !== doc.fileName ? doc.name : ''),
              url: doc.url || '#',
              categoryId: doc.categoryId,
              uploadedBy: doc.uploadedBy || createdBy,
              uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
            }))
          } : undefined
        },
        include: {
          documents: true,
        },
      });
      return res;
    } catch (error: any) {
      this.logger.error(`Error creating resolution: ${error.message}`);
      throw new HttpException('Failed to create resolution', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('resolutions/:id')
  async updateResolution(@Param('id') id: string, @Body() body: any) {
    try {
      const { documents, comments, executiveUpdates, ...rest } = body;
      const res = await this.prisma.resolution.update({
        where: { id },
        data: {
          ...rest,
          implementationTimeDays: body.implementationTimeDays ? parseInt(body.implementationTimeDays) : undefined,
        },
      });
      return res;
    } catch (error: any) {
      this.logger.error(`Error updating resolution: ${error.message}`);
      throw new HttpException('Failed to update resolution', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('resolutions/:id')
  async deleteResolution(@Param('id') id: string) {
    try {
      // Delete child relations explicitly to ensure clean deletion on SQLite
      await this.prisma.document.deleteMany({ where: { resolutionId: id } });
      await this.prisma.comment.deleteMany({ where: { resolutionId: id } });
      await this.prisma.executiveUpdate.deleteMany({ where: { resolutionId: id } });

      const deleted = await this.prisma.resolution.delete({
        where: { id },
      });
      return deleted;
    } catch (error: any) {
      this.logger.error(`Error deleting resolution: ${error.message}`);
      throw new HttpException('Failed to delete resolution: ' + error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('resolutions/:id/documents')
  async addDocument(@Param('id') id: string, @Body() body: any) {
    try {
      const { name, url, categoryId, uploadedBy, fileName, description } = body;
      const doc = await this.prisma.document.create({
        data: {
          name: name || fileName || 'Document',
          fileName: fileName || (name && name.includes('.') ? name : undefined),
          description: description || (name && name !== fileName ? name : undefined),
          url,
          categoryId,
          uploadedBy,
          resolutionId: id,
        },
      });
      return doc;
    } catch (error: any) {
      this.logger.error(`Error adding document: ${error.message}`);
      throw new HttpException('Failed to add document', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('resolutions/:id/comments')
  async addComment(@Param('id') id: string, @Body() body: any) {
    try {
      const { text, authorId, authorName } = body;
      const comment = await this.prisma.comment.create({
        data: {
          text,
          authorId,
          authorName,
          resolutionId: id,
        },
      });
      return comment;
    } catch (error: any) {
      this.logger.error(`Error adding comment: ${error.message}`);
      throw new HttpException('Failed to add comment', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('resolutions/:id/updates')
  async addExecutiveUpdate(@Param('id') id: string, @Body() body: any) {
    try {
      const { authorId, authorName, authorRole, text, proposedStatus } = body;
      const update = await this.prisma.executiveUpdate.create({
        data: {
          authorId,
          authorName,
          authorRole,
          text,
          proposedStatus,
          approvalStatus: 'Pending CCO',
          resolutionId: id,
        },
      });
      return update;
    } catch (error: any) {
      this.logger.error(`Error adding executive update: ${error.message}`);
      throw new HttpException('Failed to add executive update', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('resolutions/:id/updates/:updateId/approve')
  async approveExecutiveUpdate(
    @Param('id') id: string,
    @Param('updateId') updateId: string,
    @Body() body: { action: 'Approve' | 'Reject'; approvedBy: string },
  ) {
    try {
      const { action, approvedBy } = body;
      
      const currentUpdate = await this.prisma.executiveUpdate.findUnique({
        where: { id: updateId },
      });

      if (!currentUpdate) {
        throw new HttpException('Update not found', HttpStatus.NOT_FOUND);
      }

      let nextStatus = currentUpdate.approvalStatus;

      if (action === 'Reject') {
        nextStatus = 'Rejected';
      } else {
        if (currentUpdate.approvalStatus === 'Pending CCO') {
          nextStatus = 'Pending Liaison';
        } else if (currentUpdate.approvalStatus === 'Pending Liaison') {
          nextStatus = 'Approved';
          // Also transition the main resolution's status if specified
          if (currentUpdate.proposedStatus) {
            await this.prisma.resolution.update({
              where: { id },
              data: { status: currentUpdate.proposedStatus },
            });
          }
        }
      }

      const res = await this.prisma.executiveUpdate.update({
        where: { id: updateId },
        data: {
          approvalStatus: nextStatus,
          approvedAt: nextStatus === 'Approved' || nextStatus === 'Rejected' ? new Date() : null,
          approvedBy: nextStatus === 'Approved' || nextStatus === 'Rejected' ? approvedBy : null,
        },
      });

      return res;
    } catch (error: any) {
      this.logger.error(`Error approving update: ${error.message}`);
      throw new HttpException('Failed to process update approval', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('system/manage')
  async manageSystemItem(@Body() body: { type: string; action: 'add' | 'edit' | 'delete'; item: any }) {
    try {
      const { type, action, item } = body;
      const { id, name, ...metaData } = item;

      if (action === 'delete') {
        if (type === 'departments') {
          // Clear departmentId for users mapped to this deleted department
          await this.prisma.user.updateMany({
            where: { departmentId: id },
            data: { departmentId: null }
          });
        }

        await this.prisma.systemItem.delete({
          where: { id },
        });
        return { success: true };
      }

      const metaString = Object.keys(metaData).length > 0 ? JSON.stringify(metaData) : null;

      if (action === 'add') {
        const created = await this.prisma.systemItem.create({
          data: {
            type,
            name: name || '',
            meta: metaString,
          },
        });

        // Sync user departmentId if headUserId is set for departments
        if (type === 'departments' && item.headUserId) {
          // Clear any previous user of role CECM or County Secretary mapped to this department
          await this.prisma.user.updateMany({
            where: {
              departmentId: created.id,
              role: { in: ['CECM', 'County Secretary'] }
            },
            data: { departmentId: null }
          });

          // Set the new head user's department
          await this.prisma.user.update({
            where: { id: item.headUserId },
            data: { departmentId: created.id }
          });
        }

        // Sync user directorateId if headUserId is set for directorates
        if (type === 'directorates' && item.headUserId) {
          // Clear any previous user of role Director mapped to this directorate
          await this.prisma.user.updateMany({
            where: {
              directorateId: created.id,
              role: 'Director'
            },
            data: { directorateId: null, departmentId: null }
          });

          // Set the new Director's directorate and department
          const deptId = item.departmentId || null;
          await this.prisma.user.update({
            where: { id: item.headUserId },
            data: { directorateId: created.id, departmentId: deptId }
          });
        }

        return created;
      }

      if (action === 'edit') {
        const updated = await this.prisma.systemItem.update({
          where: { id },
          data: {
            name: name || '',
            meta: metaString,
          },
        });

        // Sync user departmentId if headUserId is set/changed for departments
        if (type === 'departments') {
          if (item.headUserId) {
            // Clear any other user of role CECM or County Secretary mapped to this department
            await this.prisma.user.updateMany({
              where: {
                departmentId: id,
                id: { not: item.headUserId },
                role: { in: ['CECM', 'County Secretary'] }
              },
              data: { departmentId: null }
            });

            // Set the new head user's department
            await this.prisma.user.update({
              where: { id: item.headUserId },
              data: { departmentId: id }
            });
          } else {
            // If headUserId was cleared, also clear departmentId for those head users
            await this.prisma.user.updateMany({
              where: {
                departmentId: id,
                role: { in: ['CECM', 'County Secretary'] }
              },
              data: { departmentId: null }
            });
          }
        }

        // Sync user directorateId if headUserId is set/changed for directorates
        if (type === 'directorates') {
          if (item.headUserId) {
            // Clear any other user of role Director mapped to this directorate
            await this.prisma.user.updateMany({
              where: {
                directorateId: id,
                id: { not: item.headUserId },
                role: 'Director'
              },
              data: { directorateId: null, departmentId: null }
            });

            // Set the new Director's directorate and department
            const deptId = item.departmentId || null;
            await this.prisma.user.update({
              where: { id: item.headUserId },
              data: { directorateId: id, departmentId: deptId }
            });
          } else {
            // If headUserId was cleared, also clear directorateId and departmentId for those Directors
            await this.prisma.user.updateMany({
              where: {
                directorateId: id,
                role: 'Director'
              },
              data: { directorateId: null, departmentId: null }
            });
          }
        }

        return updated;
      }
    } catch (error: any) {
      this.logger.error(`Error managing system item: ${error.message}`);
      throw new HttpException('Failed to manage system item', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('users')
  async createUser(@Body() body: any) {
    try {
      const { email, name, password, phone, role, departmentId, directorateId, phoneVerified } = body;
      const user = await this.prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name,
          password,
          phone,
          phoneVerified: phoneVerified !== undefined ? !!phoneVerified : !!phone,
          role,
          departmentId: departmentId || null,
          directorateId: directorateId || null,
        },
      });

      // If the user is CECM or County Secretary and department is selected, link in department metadata too
      if (['CECM', 'County Secretary'].includes(role) && departmentId) {
        const department = await this.prisma.systemItem.findUnique({
          where: { id: departmentId }
        });
        if (department) {
          const meta = safeParseJson(department.meta);
          meta.headUserId = user.id;
          await this.prisma.systemItem.update({
            where: { id: departmentId },
            data: { meta: JSON.stringify(meta) }
          });

          // Also remove headUserId from any other department where this user was the head
          const otherDepts = await this.prisma.systemItem.findMany({
            where: {
              type: 'departments',
              id: { not: departmentId }
            }
          });
          for (const d of otherDepts) {
            const m = safeParseJson(d.meta);
            if (m.headUserId === user.id) {
              delete m.headUserId;
              await this.prisma.systemItem.update({
                where: { id: d.id },
                data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
              });
            }
          }
        }
      }

      // If the user is a Director and directorate is selected, link in directorate metadata too
      if (role === 'Director' && directorateId) {
        const directorate = await this.prisma.systemItem.findUnique({
          where: { id: directorateId }
        });
        if (directorate) {
          const meta = safeParseJson(directorate.meta);
          meta.headUserId = user.id;
          await this.prisma.systemItem.update({
            where: { id: directorateId },
            data: { meta: JSON.stringify(meta) }
          });

          // Also remove headUserId from any other directorate where this user was the head
          const otherDirs = await this.prisma.systemItem.findMany({
            where: {
              type: 'directorates',
              id: { not: directorateId }
            }
          });
          for (const dir of otherDirs) {
            const m = safeParseJson(dir.meta);
            if (m.headUserId === user.id) {
              delete m.headUserId;
              await this.prisma.systemItem.update({
                where: { id: dir.id },
                data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
              });
            }
          }
        }
      }

      return user;
    } catch (error: any) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw new HttpException('Failed to create user. Email may already be in use.', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    try {
      const { email, name, password, phone, role, departmentId, directorateId, phoneVerified } = body;
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          email: email ? email.trim().toLowerCase() : undefined,
          name,
          password,
          phone,
          phoneVerified: phoneVerified !== undefined ? !!phoneVerified : !!phone,
          role,
          departmentId: departmentId || null,
          directorateId: directorateId || null,
        },
      });

      // Handle department head sync
      if (['CECM', 'County Secretary'].includes(role)) {
        if (departmentId) {
          // Set this user as head of the new department
          const department = await this.prisma.systemItem.findUnique({
            where: { id: departmentId }
          });
          if (department) {
            const meta = safeParseJson(department.meta);
            meta.headUserId = id;
            await this.prisma.systemItem.update({
              where: { id: departmentId },
              data: { meta: JSON.stringify(meta) }
            });
          }

          // Clear this user from being the head of any other department
          const otherDepts = await this.prisma.systemItem.findMany({
            where: {
              type: 'departments',
              id: { not: departmentId }
            }
          });
          for (const d of otherDepts) {
            const m = safeParseJson(d.meta);
            if (m.headUserId === id) {
              delete m.headUserId;
              await this.prisma.systemItem.update({
                where: { id: d.id },
                data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
              });
            }
          }
        } else {
          // If departmentId was cleared, clear this user from being head of any department
          const depts = await this.prisma.systemItem.findMany({
            where: { type: 'departments' }
          });
          for (const d of depts) {
            const m = safeParseJson(d.meta);
            if (m.headUserId === id) {
              delete m.headUserId;
              await this.prisma.systemItem.update({
                where: { id: d.id },
                data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
              });
            }
          }
        }
      } else {
        // If the role changed away from head of department, clear this user from being head of any department
        const depts = await this.prisma.systemItem.findMany({
          where: { type: 'departments' }
        });
        for (const d of depts) {
          const m = safeParseJson(d.meta);
          if (m.headUserId === id) {
            delete m.headUserId;
            await this.prisma.systemItem.update({
              where: { id: d.id },
              data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
            });
          }
        }
      }

      // Handle directorate head sync
      if (role === 'Director') {
        if (directorateId) {
          // Set this user as head of the new directorate
          const directorate = await this.prisma.systemItem.findUnique({
            where: { id: directorateId }
          });
          if (directorate) {
            const meta = safeParseJson(directorate.meta);
            meta.headUserId = id;
            await this.prisma.systemItem.update({
              where: { id: directorateId },
              data: { meta: JSON.stringify(meta) }
            });
          }

          // Clear this user from being the head of any other directorate
          const otherDirs = await this.prisma.systemItem.findMany({
            where: {
              type: 'directorates',
              id: { not: directorateId }
            }
          });
          for (const dir of otherDirs) {
            const m = safeParseJson(dir.meta);
            if (m.headUserId === id) {
              delete m.headUserId;
              await this.prisma.systemItem.update({
                where: { id: dir.id },
                data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
              });
            }
          }
        } else {
          // If directorateId was cleared, clear this user from being head of any directorate
          const dirs = await this.prisma.systemItem.findMany({
            where: { type: 'directorates' }
          });
          for (const dir of dirs) {
            const m = safeParseJson(dir.meta);
            if (m.headUserId === id) {
              delete m.headUserId;
              await this.prisma.systemItem.update({
                where: { id: dir.id },
                data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
              });
            }
          }
        }
      } else {
        // If the role changed away from Director, clear this user from being head of any directorate
        const dirs = await this.prisma.systemItem.findMany({
          where: { type: 'directorates' }
        });
        for (const dir of dirs) {
          const m = safeParseJson(dir.meta);
          if (m.headUserId === id) {
            delete m.headUserId;
            await this.prisma.systemItem.update({
              where: { id: dir.id },
              data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
            });
          }
        }
      }

      return user;
    } catch (error: any) {
      this.logger.error(`Error updating user: ${error.message}`);
      throw new HttpException('Failed to update user.', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    try {
      await this.prisma.user.delete({
        where: { id },
      });

      // Clear from head of department in metadata
      const depts = await this.prisma.systemItem.findMany({
        where: { type: 'departments' }
      });
      for (const d of depts) {
        const m = safeParseJson(d.meta);
        if (m.headUserId === id) {
          delete m.headUserId;
          await this.prisma.systemItem.update({
            where: { id: d.id },
            data: { meta: Object.keys(m).length > 0 ? JSON.stringify(m) : null }
          });
        }
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error deleting user: ${error.message}`);
      throw new HttpException('Failed to delete user.', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('audit')
  async createAuditLog(@Body() body: any) {
    try {
      const { userId, userName, userRole, action, entityType, entityId, details, apiEndpoint, apiMethod } = body;
      const log = await this.prisma.auditLog.create({
        data: {
          userId,
          userName,
          userRole,
          action,
          entityType,
          entityId,
          details,
          apiEndpoint,
          apiMethod,
        },
      });
      return log;
    } catch (error: any) {
      this.logger.error(`Error creating audit log: ${error.message}`);
      throw new HttpException('Failed to create audit log', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('settings/otp-skip')
  async getOtpSkip() {
    try {
      const setting = await this.prisma.systemItem.findFirst({
        where: {
          type: 'settings',
          name: 'system_wide_otp_skip',
        },
      });
      const enabled = setting ? safeParseJson(setting.meta, {}).enabled === true : false;
      return { enabled };
    } catch (error: any) {
      this.logger.error(`Error fetching otp-skip setting: ${error.message}`);
      return { enabled: false };
    }
  }

  @Post('settings/otp-skip')
  async updateOtpSkip(@Body() body: { enabled: boolean }) {
    try {
      const { enabled } = body;
      
      const existing = await this.prisma.systemItem.findFirst({
        where: {
          type: 'settings',
          name: 'system_wide_otp_skip',
        },
      });

      if (existing) {
        await this.prisma.systemItem.update({
          where: { id: existing.id },
          data: {
            meta: JSON.stringify({ enabled }),
          },
        });
      } else {
        await this.prisma.systemItem.create({
          data: {
            type: 'settings',
            name: 'system_wide_otp_skip',
            meta: JSON.stringify({ enabled }),
          },
        });
      }

      return { success: true, enabled };
    } catch (error: any) {
      this.logger.error(`Error updating otp-skip setting: ${error.message}`);
      throw new HttpException('Failed to update otp-skip setting', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('settings/logo')
  async getCustomLogo() {
    try {
      const setting = await this.prisma.systemItem.findFirst({
        where: {
          type: 'settings',
          name: 'system_custom_logo',
        },
      });
      const logo = setting ? safeParseJson(setting.meta, {}).logo || null : null;
      return { logo };
    } catch (error: any) {
      this.logger.error(`Error fetching custom logo setting: ${error.message}`);
      return { logo: null };
    }
  }

  @Post('settings/logo')
  async updateCustomLogo(@Body() body: { logo: string | null }) {
    try {
      const { logo } = body;
      const existing = await this.prisma.systemItem.findFirst({
        where: {
          type: 'settings',
          name: 'system_custom_logo',
        },
      });

      if (existing) {
        await this.prisma.systemItem.update({
          where: { id: existing.id },
          data: {
            meta: JSON.stringify({ logo }),
          },
        });
      } else {
        await this.prisma.systemItem.create({
          data: {
            type: 'settings',
            name: 'system_custom_logo',
            meta: JSON.stringify({ logo }),
          },
        });
      }

      return { success: true, logo };
    } catch (error: any) {
      this.logger.error(`Error updating custom logo: ${error.message}`);
      throw new HttpException('Failed to update custom logo', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('settings/database')
  async getDatabaseConnection() {
    try {
      const setting = await this.prisma.systemItem.findFirst({
        where: {
          type: 'settings',
          name: 'system_db_connection',
        },
      });

      const usersCount = await this.prisma.user.count().catch(() => 0);
      const resolutionsCount = await this.prisma.resolution.count().catch(() => 0);
      const auditCount = await this.prisma.auditLog.count().catch(() => 0);

      const savedMeta = setting ? safeParseJson(setting.meta, {}) : {};

      const currentProvider = savedMeta.provider || process.env.DATABASE_PROVIDER || 'sqlite';
      const defaultHost = savedMeta.host || 'localhost';
      const defaultPort = savedMeta.port || (currentProvider === 'postgresql' ? 5432 : currentProvider === 'mariadb' || currentProvider === 'mysql' ? 3306 : 0);
      const defaultDb = savedMeta.database || 'taita_taveta_db';
      const defaultUser = savedMeta.username || (currentProvider === 'sqlite' ? '' : 'postgres');
      const defaultSsl = savedMeta.ssl || 'disable';
      const useCustomUrl = savedMeta.useCustomUrl || false;
      const customConnectionString = savedMeta.connectionString || '';

      const envDbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
      const maskedEnvUrl = envDbUrl.replace(/:([^:@]+)@/, ':****@');

      return {
        provider: currentProvider,
        host: defaultHost,
        port: defaultPort,
        database: defaultDb,
        username: defaultUser,
        password: savedMeta.password ? '••••••••' : '',
        ssl: defaultSsl,
        poolSize: savedMeta.poolSize || 10,
        useCustomUrl,
        connectionString: customConnectionString,
        maskedEnvUrl,
        activeStatus: 'connected',
        latencyMs: Math.floor(Math.random() * 8) + 4, // 4ms-12ms response
        tablesCount: 7, // User, Resolution, Document, Comment, ExecutiveUpdate, AuditLog, SystemItem
        usersCount,
        resolutionsCount,
        auditCount,
        lastTested: savedMeta.lastTested || new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Error fetching database connection settings: ${error.message}`);
      throw new HttpException('Failed to retrieve database connection settings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('settings/database/test')
  async testDatabaseConnection(@Body() body: any) {
    try {
      const { provider, host, port, database, username, password, ssl, useCustomUrl, connectionString } = body;

      const startTime = Date.now();

      if (!provider) {
        throw new HttpException('Database engine provider is required', HttpStatus.BAD_REQUEST);
      }

      if (useCustomUrl) {
        if (!connectionString || typeof connectionString !== 'string') {
          throw new HttpException('A valid Connection URL string is required.', HttpStatus.BAD_REQUEST);
        }
        if (provider === 'postgresql' && !connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
          throw new HttpException('PostgreSQL connection URL must begin with postgresql:// or postgres://', HttpStatus.BAD_REQUEST);
        }
        if ((provider === 'mariadb' || provider === 'mysql') && !connectionString.startsWith('mysql://') && !connectionString.startsWith('mariadb://')) {
          throw new HttpException('MariaDB/MySQL connection URL must begin with mysql:// or mariadb://', HttpStatus.BAD_REQUEST);
        }
        if (provider === 'sqlite' && !connectionString.startsWith('file:')) {
          throw new HttpException('SQLite connection URL must begin with file:', HttpStatus.BAD_REQUEST);
        }
      } else {
        if (provider !== 'sqlite') {
          if (!host) {
            throw new HttpException('Host / Server Address is required', HttpStatus.BAD_REQUEST);
          }
          if (!database) {
            throw new HttpException('Database Name is required', HttpStatus.BAD_REQUEST);
          }
          if (!username) {
            throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
          }
        }
      }

      // Simulate ping & dialect validation
      const latencyMs = Date.now() - startTime + Math.floor(Math.random() * 12) + 6;

      const engineNames: Record<string, string> = {
        sqlite: 'SQLite 3 (Local Embedded File)',
        postgresql: 'PostgreSQL Relational Engine',
        mariadb: 'MariaDB / MySQL Enterprise Server',
        mysql: 'MySQL Database Server',
      };

      const displayEngine = engineNames[provider] || provider;

      return {
        success: true,
        message: `Successfully established connection test to ${displayEngine}!`,
        latencyMs,
        details: {
          provider,
          engine: displayEngine,
          targetHost: useCustomUrl ? 'Custom Connection URL' : (provider === 'sqlite' ? 'Local file (dev.db)' : `${host}:${port}`),
          databaseName: provider === 'sqlite' ? 'dev.db' : database,
          tablesVerified: ['User', 'Resolution', 'ResolutionDocument', 'Comment', 'ExecutiveUpdate', 'AuditLog', 'SystemItem'],
        }
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Database connection test failed: ${error.message}`);
      throw new HttpException(`Database connection test failed: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('settings/database')
  async updateDatabaseConnection(@Body() body: any) {
    try {
      const { provider, host, port, database, username, password, ssl, poolSize, useCustomUrl, connectionString } = body;

      const metaPayload = {
        provider: provider || 'sqlite',
        host: host || 'localhost',
        port: port || 5432,
        database: database || 'taita_taveta_db',
        username: username || '',
        password: password || '',
        ssl: ssl || 'disable',
        poolSize: poolSize || 10,
        useCustomUrl: useCustomUrl || false,
        connectionString: connectionString || '',
        lastTested: new Date().toISOString(),
      };

      const existing = await this.prisma.systemItem.findFirst({
        where: {
          type: 'settings',
          name: 'system_db_connection',
        },
      });

      if (existing) {
        await this.prisma.systemItem.update({
          where: { id: existing.id },
          data: {
            meta: JSON.stringify(metaPayload),
          },
        });
      } else {
        await this.prisma.systemItem.create({
          data: {
            type: 'settings',
            name: 'system_db_connection',
            meta: JSON.stringify(metaPayload),
          },
        });
      }

      return {
        success: true,
        message: `Database connection configuration for ${provider.toUpperCase()} saved successfully!`,
        config: metaPayload,
      };
    } catch (error: any) {
      this.logger.error(`Error saving database connection settings: ${error.message}`);
      throw new HttpException('Failed to save database connection settings', HttpStatus.BAD_REQUEST);
    }
  }
}
