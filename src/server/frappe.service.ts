import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { DatabaseConfig } from './database.config';

@Injectable()
export class FrappeService implements OnModuleInit {
  private readonly logger = new Logger(FrappeService.name);
  private frappeSessionCookie: string | null = null;
  private sessionInitPromise: Promise<string | null> | null = null;

  constructor(@Inject(DatabaseConfig) private readonly config: DatabaseConfig) {}

  async onModuleInit() {
    this.logger.log('Initializing Frappe background session...');
    await this.initFrappeSession();

    // Re-establish session periodically (every 4 hours)
    setInterval(() => {
      this.logger.log('Refreshing Frappe session (4-hour interval)');
      this.frappeSessionCookie = null;
      this.sessionInitPromise = null;
      this.initFrappeSession();
    }, 4 * 60 * 60 * 1000);
  }

  async initFrappeSession(): Promise<string | null> {
    if (this.frappeSessionCookie) return this.frappeSessionCookie;
    if (this.sessionInitPromise) return this.sessionInitPromise;

    const { baseUrl, user, pass } = this.config.frappe;

    this.sessionInitPromise = (async () => {
      try {
        this.logger.log(`Logging into Frappe at: ${baseUrl} for user: ${user}`);
        const response = await fetch(`${baseUrl}/api/method/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `usr=${encodeURIComponent(user)}&pwd=${encodeURIComponent(pass)}`,
          redirect: 'manual',
        });

        if (response.ok || response.status === 302) {
          // Extract sid cookie from response
          const setCookies = response.headers.getSetCookie?.() || [];
          const headersAny = response.headers as any;
          const raw = typeof headersAny.raw === 'function' ? headersAny.raw() : null;
          const cookieHeaders =
            setCookies.length > 0 ? setCookies : raw?.['set-cookie'] || [];

          for (const cookie of cookieHeaders) {
            const sidMatch = cookie.match(/sid=([^;]+)/);
            if (sidMatch && sidMatch[1] !== 'Guest') {
              this.frappeSessionCookie = `sid=${sidMatch[1]}`;
              this.logger.log('[SESSION] Frappe session established successfully');
              return this.frappeSessionCookie;
            }
          }
          this.logger.warn('[SESSION] No valid sid cookie in response');
        } else {
          this.logger.warn(`[SESSION] Login failed: HTTP ${response.status}`);
        }
      } catch (err: any) {
        this.logger.error(`[SESSION] Error establishing session: ${err.message}`);
      }
      this.sessionInitPromise = null;
      return null;
    })();

    return this.sessionInitPromise;
  }

  getCookie(): string | null {
    return this.frappeSessionCookie;
  }

  async authenticateUser(email: string, pass: string): Promise<string | null> {
    const baseUrl = this.config.frappe.baseUrl;
    try {
      this.logger.log(`[AUTH] Verifying credentials on remote Frappe for: ${email}`);
      const response = await fetch(`${baseUrl}/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `usr=${encodeURIComponent(email)}&pwd=${encodeURIComponent(pass)}`,
        redirect: 'manual',
      });

      if (response.ok || response.status === 302) {
        const setCookies = response.headers.getSetCookie?.() || [];
        const headersAny = response.headers as any;
        const raw = typeof headersAny.raw === 'function' ? headersAny.raw() : null;
        const cookieHeaders =
          setCookies.length > 0 ? setCookies : raw?.['set-cookie'] || [];

        for (const cookie of cookieHeaders) {
          const sidMatch = cookie.match(/sid=([^;]+)/);
          if (sidMatch && sidMatch[1] !== 'Guest') {
            const cookieVal = `sid=${sidMatch[1]}`;
            this.logger.log(`[AUTH] Remote Frappe authentication succeeded for: ${email}`);
            return cookieVal;
          }
        }
        this.logger.warn(`[AUTH] Remote Frappe response didn't contain valid sid for: ${email}`);
      } else {
        this.logger.warn(`[AUTH] Remote Frappe login failed with status ${response.status} for: ${email}`);
      }
    } catch (err: any) {
      this.logger.error(`[AUTH] Error during remote Frappe authentication for ${email}: ${err.message}`);
    }
    return null;
  }

  async getUserMobileNo(email: string, userSidCookie?: string): Promise<string | null> {
    const baseUrl = this.config.frappe.baseUrl;
    const cookie = userSidCookie || this.frappeSessionCookie;
    
    if (!cookie) {
      this.logger.warn(`[FRAPPE] No session cookie available to fetch mobile_no for: ${email}`);
      return null;
    }

    try {
      this.logger.log(`[FRAPPE] Fetching User doc for ${email} to retrieve mobile_no...`);
      const response = await fetch(`${baseUrl}/api/resource/User/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Cookie': cookie,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const mobileNo = data.data?.mobile_no || data.data?.phone;
        if (mobileNo) {
          this.logger.log(`[FRAPPE] Found mobile_no: ${mobileNo} for user: ${email}`);
          return String(mobileNo);
        } else {
          this.logger.warn(`[FRAPPE] User doc for ${email} did not contain a mobile_no field: ${JSON.stringify(data.data)}`);
        }
      } else {
        this.logger.warn(`[FRAPPE] Failed to fetch User doc: HTTP ${response.status} ${response.statusText}`);
        
        // If we tried with userSidCookie and it failed, try falling back to the background admin session cookie!
        if (userSidCookie && this.frappeSessionCookie && userSidCookie !== this.frappeSessionCookie) {
          this.logger.log(`[FRAPPE] Retrying fetching User doc using background session cookie...`);
          const retryResponse = await fetch(`${baseUrl}/api/resource/User/${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
              'Cookie': this.frappeSessionCookie,
              'Accept': 'application/json',
            },
          });
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            const mobileNo = data.data?.mobile_no;
            if (mobileNo) {
              return String(mobileNo);
            }
          } else {
            this.logger.warn(`[FRAPPE] Retry with background session cookie also failed: HTTP ${retryResponse.status}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`[FRAPPE] Error fetching user mobile_no for ${email}: ${err.message}`);
    }
    return null;
  }
}
