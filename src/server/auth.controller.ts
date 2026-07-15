import { Controller, Post, Body, HttpException, HttpStatus, Logger, Get, Inject } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SmsService } from './sms.service';
import { FrappeService } from './frappe.service';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SmsService) private readonly sms: SmsService,
    @Inject(FrappeService) private readonly frappeService: FrappeService,
  ) {}

  @Post('send-otp')
  async sendOtp(@Body() body: { email?: string; password?: string }) {
    const { email, password } = body;
    if (!email || !password) {
      throw new HttpException('Email and password are required', HttpStatus.BAD_REQUEST);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Try to authenticate via remote Frappe first
    /*
    const frappeCookie = await this.frappeService.authenticateUser(normalizedEmail, password);

    if (!frappeCookie) {
      this.logger.warn(`[AUTH] Remote Frappe authentication failed for user: ${normalizedEmail}`);
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }
    */

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.password !== password) {
      this.logger.warn(`[AUTH] Local authentication failed for user: ${normalizedEmail}`);
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    // Fetch user's phone number from Frappe session User Doctype (field 'mobile_no')
    /*
    const mobileNo = await this.frappeService.getUserMobileNo(normalizedEmail, frappeCookie);
    */
    let targetPhone = user.phone || '';

    /*
    if (mobileNo) {
      targetPhone = mobileNo;
      if (user.phone !== mobileNo) {
        this.logger.log(`[AUTH] Updating local user phone number from remote: ${mobileNo}`);
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { phone: mobileNo },
        });
      }
    }
    */

    if (user.role === 'System Administrator') {
      this.logger.log(`[AUTH] OTP bypassed for System Administrator: ${normalizedEmail}`);
      return {
        success: true,
        otpBypassed: true,
        message: 'OTP bypass active for System Administrator',
      };
    }

    // Generate a secure 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Save the OTP to the database
    await this.prisma.oTP.create({
      data: {
        email: normalizedEmail,
        phone: targetPhone,
        code,
        expiresAt,
      },
    });

    this.logger.log(`[AUTH] Generated OTP ${code} for ${normalizedEmail}`);

    // If user has a phone number registered, send the OTP via SMS
    if (targetPhone) {
      const message = `Taita Taveta Resolution Tracker: Your login verification code is ${code}. It expires in 5 minutes.`;
      await this.sms.sendSms(targetPhone, message);
    } else {
      this.logger.warn(`[AUTH] User ${normalizedEmail} does not have a phone number. OTP logged to console.`);
    }

    return {
      success: true,
      message: 'OTP sent successfully to your registered email & phone number',
    };
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string; otp?: string }) {
    const { email, password, otp } = body;
    if (!email || !password || !otp) {
      throw new HttpException('Email, password, and OTP are required', HttpStatus.BAD_REQUEST);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify remote Frappe credentials
    /*
    const frappeCookie = await this.frappeService.authenticateUser(normalizedEmail, password);

    if (!frappeCookie) {
      this.logger.warn(`[AUTH] Remote Frappe authentication failed for user: ${normalizedEmail}`);
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }
    */

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.password !== password) {
      this.logger.warn(`[AUTH] Local authentication failed for user during login: ${normalizedEmail}`);
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    // Fetch user's phone number from Frappe session User Doctype (field 'mobile_no')
    /*
    const mobileNo = await this.frappeService.getUserMobileNo(normalizedEmail, frappeCookie);
    if (mobileNo && user.phone !== mobileNo) {
      this.logger.log(`[AUTH] Updating local user phone number from remote during login: ${mobileNo}`);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phone: mobileNo },
      });
    }
    */

    // Verify OTP
    const isSysAdmin = user.role === 'System Administrator';
    if (isSysAdmin && otp === 'BYPASS_OTP') {
      this.logger.log(`[AUTH] OTP bypass validated successfully for System Administrator: ${normalizedEmail}`);
    } else {
      const validOtp = await this.prisma.oTP.findFirst({
        where: {
          email: normalizedEmail,
          code: otp,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!validOtp) {
        throw new HttpException('Invalid or expired OTP', HttpStatus.UNAUTHORIZED);
      }

      // Cleanup verified OTP
      await this.prisma.oTP.deleteMany({
        where: { email: normalizedEmail },
      });
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        directorateId: user.directorateId,
      },
    };
  }
}
