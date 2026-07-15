import { Injectable, Logger, Inject } from '@nestjs/common';
import { DatabaseConfig } from './database.config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@Inject(DatabaseConfig) private readonly config: DatabaseConfig) {}

  /**
   * Sends an SMS message to a phone number.
   * Handles Kenyan phone format sanitization (converting to 254XXXXXXXXX).
   */
  async sendSms(phone: string, message: string): Promise<boolean> {
    const { baseUrl, apiKey, senderId } = this.config.tilili;

    // Sanitize phone number to standard international format (254...)
    let sanitizedPhone = phone.trim().replace(/\D/g, '');
    if (sanitizedPhone.startsWith('0')) {
      sanitizedPhone = '254' + sanitizedPhone.substring(1);
    } else if (sanitizedPhone.startsWith('+')) {
      sanitizedPhone = sanitizedPhone.substring(1);
    } else if (sanitizedPhone.startsWith('7') || sanitizedPhone.startsWith('1')) {
      sanitizedPhone = '254' + sanitizedPhone;
    }

    this.logger.log(`[SMS] Attempting to send message to: ${sanitizedPhone} (using Sender ID: ${senderId})`);
    this.logger.log(`[SMS] Message Content: "${message}"`);

    try {
      const payload = {
        api_key: apiKey,
        shortcode: senderId,
        mobile: sanitizedPhone,
        message: message,
      };

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      this.logger.log(`[SMS] Tilil API Response status: ${response.status}. Response: ${responseText}`);

      if (response.ok) {
        this.logger.log(`[SMS] Message sent successfully to ${sanitizedPhone}`);
        return true;
      } else {
        this.logger.warn(`[SMS] Failed to send message via Tilil: HTTP ${response.status}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`[SMS] Error occurred while sending SMS: ${error.message}`);
      return false;
    }
  }
}
