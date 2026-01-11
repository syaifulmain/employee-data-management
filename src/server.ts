import express from "express";
import * as dotenv from "dotenv";
import { App } from "./app";
import { AppDataSource } from "./config/database/datasource";
import loggerHandler from "./lib/helper/loggerHandler";
import { seedDatabase } from "./lib/helper/databaseSeeder";
import helmet from "helmet";
import { initializeCronJobs } from "./lib/services/cronjob.service";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

async function startServer(): Promise<void> {
  const app = express();
  const mainApp = new App();

  const PORT = process.env.PORT || 8080;
  const NODE_ENV = process.env.NODE_ENV || "development";
  const AUTO_SYNC_DB = process.env.AUTO_SYNC_DB === "true";

  try {
    if (!process.env.DATABASE_URL && !AppDataSource.options.database) {
      throw new Error("Missing DATABASE_URL or database config in .env");
    }

    app.set("trust proxy", 1);

    // ✅ Configure Helmet CSP to allow Swagger UI to connect to API endpoints
    app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "connect-src": ["'self'", "http://localhost:3001"], // 👈 allow Swagger UI calls
            "img-src": ["'self'", "data:", "https:"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
          },
        },
      }),
    );

    mainApp.SetupMiddleware(app);
    mainApp.SetupRoutes(app);
    mainApp.SetupErrorHandling(app);

    // Initialize Database
    loggerHandler.info("⏳ Connecting to PostgreSQL...");
    await AppDataSource.initialize();
    loggerHandler.info("✅ Database connected successfully.");

    // Auto create tables if env enabled
    if (AUTO_SYNC_DB) {
      loggerHandler.info("🧱 AUTO_SYNC_DB=true → Ensuring tables exist...");
      await AppDataSource.synchronize();
      loggerHandler.info("✅ Tables are up to date.");
    } else {
      loggerHandler.info(
        "ℹ️ AUTO_SYNC_DB=false → Skipping schema synchronization.",
      );
    }

    // Auto seed only after sync
    loggerHandler.info("🌱 Running database seeder...");
    // const {seedDatabase} = await import("./lib/helper/databaseSeeder");
    await seedDatabase(AppDataSource);

    // Initialize cron jobs
    loggerHandler.info("🕐 Initializing cron jobs...");
    const cronService = initializeCronJobs(AppDataSource);

    // Start server
    const server = app.listen(PORT, () => {
      loggerHandler.info(
        `🚀 Server running on port ${PORT} (${NODE_ENV} mode)`,
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      loggerHandler.warn(`⚠️ Received ${signal}, shutting down gracefully...`);

      // Stop cron jobs first
      cronService.stopAllJobs();

      server.close(async () => {
        loggerHandler.info("🛑 HTTP server closed.");
        try {
          await AppDataSource.destroy();
          loggerHandler.info("📦 Database connection closed.");
        } catch (dbError) {
          loggerHandler.error(`❌ Error closing database: ${dbError}`);
        } finally {
          process.exit(0);
        }
      });
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error: any) {
    loggerHandler.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();
