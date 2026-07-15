import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('api')
export class DataController {
  private readonly logger = new Logger(DataController.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('data')
  async getAllData() {
    try {
      const users = await this.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, departmentId: true, directorateId: true }
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
      const departments = systemItems.filter((i) => i.type === 'departments').map((i) => ({ id: i.id, name: i.name, ...(i.meta ? JSON.parse(i.meta) : {}) }));
      const directorates = systemItems.filter((i) => i.type === 'directorates').map((i) => ({ id: i.id, name: i.name, ...(i.meta ? JSON.parse(i.meta) : {}) }));
      const committees = systemItems.filter((i) => i.type === 'committees').map((i) => ({ id: i.id, name: i.name, ...(i.meta ? JSON.parse(i.meta) : {}) }));
      const docCategories = systemItems.filter((i) => i.type === 'docCategories').map((i) => ({ id: i.id, name: i.name, ...(i.meta ? JSON.parse(i.meta) : {}) }));
      const statusCategories = systemItems.filter((i) => i.type === 'statusCategories').map((i) => ({ id: i.id, name: i.name, ...(i.meta ? JSON.parse(i.meta) : {}) }));

      return {
        users,
        resolutions,
        departments,
        directorates,
        committees,
        docCategories,
        statusCategories,
        auditLogs,
      };
    } catch (error: any) {
      this.logger.error(`Error fetching system data: ${error.message}`);
      throw new HttpException('Failed to retrieve system data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('resolutions')
  async createResolution(@Body() body: any) {
    try {
      const { referenceNumber, title, description, status, datePassed, implementationTimeDays, dueDate, departmentId, committeeId, directorateId, createdBy } = body;
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
      const deleted = await this.prisma.resolution.delete({
        where: { id },
      });
      return deleted;
    } catch (error: any) {
      this.logger.error(`Error deleting resolution: ${error.message}`);
      throw new HttpException('Failed to delete resolution', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('resolutions/:id/documents')
  async addDocument(@Param('id') id: string, @Body() body: any) {
    try {
      const { name, url, categoryId, uploadedBy } = body;
      const doc = await this.prisma.document.create({
        data: {
          name,
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
      const { email, name, password, phone, role, departmentId, directorateId } = body;
      const user = await this.prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name,
          password,
          phone,
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
          const meta = department.meta ? JSON.parse(department.meta) : {};
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
            const m = d.meta ? JSON.parse(d.meta) : {};
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
          const meta = directorate.meta ? JSON.parse(directorate.meta) : {};
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
            const m = dir.meta ? JSON.parse(dir.meta) : {};
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
      const { email, name, password, phone, role, departmentId, directorateId } = body;
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          email: email ? email.trim().toLowerCase() : undefined,
          name,
          password,
          phone,
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
            const meta = department.meta ? JSON.parse(department.meta) : {};
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
            const m = d.meta ? JSON.parse(d.meta) : {};
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
            const m = d.meta ? JSON.parse(d.meta) : {};
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
          const m = d.meta ? JSON.parse(d.meta) : {};
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
            const meta = directorate.meta ? JSON.parse(directorate.meta) : {};
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
            const m = dir.meta ? JSON.parse(dir.meta) : {};
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
            const m = dir.meta ? JSON.parse(dir.meta) : {};
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
          const m = dir.meta ? JSON.parse(dir.meta) : {};
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
        const m = d.meta ? JSON.parse(d.meta) : {};
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
}
