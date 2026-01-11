import * as cron from "node-cron";
import { DataSource } from "typeorm";
import loggerHandler from "../helper/loggerHandler";
import { emailService } from "./email.service";
import { EntityEmployee } from "../../app/module/employee/employee.model";

/**
 * Cron Job Service
 * Manages scheduled tasks for the application
 */
export class CronJobService {
  private dataSource: DataSource;
  private jobs: Map<string, any> = new Map();

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Initialize all cron jobs
   */
  public initializeJobs() {
    loggerHandler.info("🕐 Initializing cron jobs...");

    // Daily report at 8:00 AM every day
    this.scheduleDailyReport();

    // Birthday reminder check at 7:00 AM every day
    this.scheduleBirthdayReminder();

    // Database backup reminder every Sunday at 2:00 AM
    this.scheduleWeeklyBackupReminder();

    loggerHandler.info(`✅ ${this.jobs.size} cron job(s) initialized successfully`);
  }

  /**
   * Schedule daily employee report
   * Runs every day at 8:00 AM
   */
  private scheduleDailyReport() {
    const jobName = "daily-report";
    const cronExpression = process.env.CRON_DAILY_REPORT || "0 8 * * *"; // 8:00 AM daily

    const task = cron.schedule(
      cronExpression,
      async () => {
        loggerHandler.info("📊 Running daily report cron job...");

        try {
          const employeeRepository = this.dataSource.getRepository(EntityEmployee);

          // Get total employees
          const totalEmployees = await employeeRepository.count();

          // For demonstration: get count of employees (in production, you'd track creation/update timestamps)
          const newToday = 0; // You can add a createdAt field to track this
          const updatedToday = 0; // You can add an updatedAt field to track this

          const stats = {
            totalEmployees,
            newToday,
            updatedToday,
          };

          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail && emailService.isReady()) {
            await emailService.sendDailyReport(adminEmail, stats);
            loggerHandler.info("✅ Daily report sent successfully");
          } else {
            loggerHandler.warn("⚠️ Admin email not configured or email service not ready");
          }
        } catch (error) {
          loggerHandler.error(`❌ Failed to generate daily report: ${error.message}`);
        }
      },
      {
        timezone: process.env.TIMEZONE || "Asia/Jakarta",
      }
    );

    this.jobs.set(jobName, task);
    loggerHandler.info(`✅ Scheduled: ${jobName} (${cronExpression})`);
  }

  /**
   * Schedule birthday reminder check
   * Runs every day at 7:00 AM
   */
  private scheduleBirthdayReminder() {
    const jobName = "birthday-reminder";
    const cronExpression = process.env.CRON_BIRTHDAY_REMINDER || "0 7 * * *"; // 7:00 AM daily

    const task = cron.schedule(
      cronExpression,
      async () => {
        loggerHandler.info("🎂 Running birthday reminder cron job...");

        try {
          const employeeRepository = this.dataSource.getRepository(EntityEmployee);

          // Get today's date (month and day only)
          const today = new Date();
          const todayMonth = today.getMonth() + 1; // 1-12
          const todayDay = today.getDate(); // 1-31

          // Query employees with birthdays today
          const employees = await employeeRepository
            .createQueryBuilder("employee")
            .where("EXTRACT(MONTH FROM employee.dateOfBirth) = :month", { month: todayMonth })
            .andWhere("EXTRACT(DAY FROM employee.dateOfBirth) = :day", { day: todayDay })
            .getMany();

          if (employees.length > 0) {
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail && emailService.isReady()) {
              const employeeList = employees.map(emp => ({
                name: emp.name,
                email: emp.email,
              }));

              await emailService.sendBirthdayReminder(adminEmail, employeeList);
              loggerHandler.info(`✅ Birthday reminder sent for ${employees.length} employee(s)`);
            } else {
              loggerHandler.warn("⚠️ Admin email not configured or email service not ready");
            }
          } else {
            loggerHandler.info("ℹ️ No birthdays today");
          }
        } catch (error) {
          loggerHandler.error(`❌ Failed to check birthdays: ${error.message}`);
        }
      },
      {
        timezone: process.env.TIMEZONE || "Asia/Jakarta",
      }
    );

    this.jobs.set(jobName, task);
    loggerHandler.info(`✅ Scheduled: ${jobName} (${cronExpression})`);
  }

  /**
   * Schedule weekly backup reminder
   * Runs every Sunday at 2:00 AM
   */
  private scheduleWeeklyBackupReminder() {
    const jobName = "weekly-backup-reminder";
    const cronExpression = process.env.CRON_BACKUP_REMINDER || "0 2 * * 0"; // 2:00 AM every Sunday

    const task = cron.schedule(
      cronExpression,
      async () => {
        loggerHandler.info("💾 Running weekly backup reminder cron job...");

        try {
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail && emailService.isReady()) {
            const subject = "Weekly Database Backup Reminder 💾";
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Weekly Backup Reminder 💾</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                  This is a reminder to perform a database backup for the Employee Management System.
                </p>
                <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                  <strong>⚠️ Important:</strong> Regular backups help protect your data from loss.
                </div>
                <p style="font-size: 14px; color: #888; margin-top: 30px;">
                  This is an automated weekly reminder.
                </p>
              </div>
            `;

            await emailService.sendEmail({
              to: adminEmail,
              subject,
              html,
            });

            loggerHandler.info("✅ Weekly backup reminder sent successfully");
          } else {
            loggerHandler.warn("⚠️ Admin email not configured or email service not ready");
          }
        } catch (error) {
          loggerHandler.error(`❌ Failed to send backup reminder: ${error.message}`);
        }
      },
      {
        timezone: process.env.TIMEZONE || "Asia/Jakarta",
      }
    );

    this.jobs.set(jobName, task);
    loggerHandler.info(`✅ Scheduled: ${jobName} (${cronExpression})`);
  }

  /**
   * Get all active cron jobs
   */
  public getActiveJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Stop a specific cron job
   */
  public stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      loggerHandler.info(`🛑 Stopped cron job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all cron jobs
   */
  public stopAllJobs() {
    this.jobs.forEach((job, name) => {
      job.stop();
      loggerHandler.info(`🛑 Stopped cron job: ${name}`);
    });
    this.jobs.clear();
    loggerHandler.info("✅ All cron jobs stopped");
  }

  /**
   * Restart a specific cron job
   */
  public restartJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      loggerHandler.info(`🔄 Restarted cron job: ${jobName}`);
      return true;
    }
    return false;
  }
}

// Export function to initialize cron jobs
export function initializeCronJobs(dataSource: DataSource): CronJobService {
  const cronService = new CronJobService(dataSource);
  cronService.initializeJobs();
  return cronService;
}

