import nodemailer from "nodemailer";
import loggerHandler from "../helper/loggerHandler";

/**
 * Email Service Configuration
 * Handles all email sending operations using Nodemailer
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with configuration from environment variables
   */
  private initializeTransporter() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      };

      // Check if email is configured
      if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
        loggerHandler.warn("⚠️ Email service not configured. Email features will be disabled.");
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;

      // Verify connection configuration
      this.transporter.verify((error, _success) => {
        if (error) {
          loggerHandler.error(`❌ Email service verification failed: ${error.message}`);
          this.isConfigured = false;
        } else {
          loggerHandler.info("✅ Email service is ready to send messages");
        }
      });
    } catch (error) {
      loggerHandler.error(`❌ Failed to initialize email service: ${error.message}`);
      this.isConfigured = false;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: any[];
  }): Promise<boolean> {
    if (!this.isConfigured) {
      loggerHandler.warn("⚠️ Email service not configured. Cannot send email.");
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || "Employee Management System"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      loggerHandler.info(`✅ Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      loggerHandler.error(`❌ Failed to send email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send welcome email to new employee
   */
  async sendWelcomeEmail(employeeEmail: string, employeeName: string): Promise<boolean> {
    const subject = "Welcome to Our Company! 🎉";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome Aboard, ${employeeName}! 🎉</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          We are excited to have you as part of our team! Your employee profile has been successfully created.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          If you have any questions, please don't hesitate to reach out to the HR department.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 14px; color: #888;">
          Best regards,<br>
          <strong>HR Team</strong>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: employeeEmail,
      subject,
      html,
    });
  }

  /**
   * Send notification email about data import results
   */
  async sendImportNotification(
    adminEmail: string,
    result: { imported: number; failed: number; totalRecords: number }
  ): Promise<boolean> {
    const subject = `Employee Data Import Completed - ${result.imported}/${result.totalRecords} records`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Import Process Completed 📊</h1>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #555;">Import Summary:</h3>
          <ul style="font-size: 16px; line-height: 1.8; color: #555;">
            <li><strong>Total Records:</strong> ${result.totalRecords}</li>
            <li style="color: #28a745;"><strong>Successfully Imported:</strong> ${result.imported}</li>
            <li style="color: #dc3545;"><strong>Failed:</strong> ${result.failed}</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #888;">
          This is an automated notification from the Employee Management System.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject,
      html,
    });
  }

  /**
   * Send daily report email
   */
  async sendDailyReport(adminEmail: string, stats: {
    totalEmployees: number;
    newToday: number;
    updatedToday: number;
  }): Promise<boolean> {
    const subject = `Daily Employee Report - ${new Date().toLocaleDateString()}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Daily Employee Report 📈</h1>
        <p style="font-size: 14px; color: #888;">
          ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #555;">Statistics:</h3>
          <ul style="font-size: 16px; line-height: 1.8; color: #555;">
            <li><strong>Total Employees:</strong> ${stats.totalEmployees}</li>
            <li><strong>New Today:</strong> ${stats.newToday}</li>
            <li><strong>Updated Today:</strong> ${stats.updatedToday}</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #888;">
          This is an automated daily report from the Employee Management System.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject,
      html,
    });
  }

  /**
   * Send employee birthday reminder
   */
  async sendBirthdayReminder(adminEmail: string, employees: Array<{ name: string; email: string }>): Promise<boolean> {
    if (employees.length === 0) {
      return true;
    }

    const subject = `Birthday Reminder - ${employees.length} employee(s) 🎂`;
    const employeeList = employees.map(emp => `<li><strong>${emp.name}</strong> (${emp.email})</li>`).join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Birthday Reminder 🎂</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          The following employee(s) have birthday(s) today:
        </p>
        <ul style="font-size: 16px; line-height: 1.8; color: #555;">
          ${employeeList}
        </ul>
        <p style="font-size: 14px; color: #888; margin-top: 30px;">
          Don't forget to wish them a happy birthday! 🎉
        </p>
      </div>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject,
      html,
    });
  }

  /**
   * Check if email service is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();

