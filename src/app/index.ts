import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { AppDataSource } from "../config/database/datasource";
import { ErrorHandler } from "../lib/helper/errorHandler";
import loggerHandler from "../lib/helper/loggerHandler";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";

import { EmployeeController } from "./module/employee/employee.controller";
import { EmployeeService } from "./module/employee/employee.service";

const prefix = process.env.API_PREFIX || "/api/v1";
const env = process.env.NODE_ENV || "development";

export class App {
  /**
   * ✅ Setup global middlewares
   */
  public SetupMiddleware(app: Application): void {
    // --- Security headers (Helmet)
    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
      }),
    );

    // --- CORS
    const corsOrigins = process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
    ];
    app.use(
      cors({
        origin: corsOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true,
        optionsSuccessStatus: 200,
      }),
    );

    // --- Body parsers
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // --- Request compression for performance
    app.use(compression());

    // --- HTTP request logging (Morgan + Winston)
    if (env !== "production") {
      app.use(morgan("dev"));
    } else {
      app.use(
        morgan("combined", {
          stream: {
            write: (message) => loggerHandler.http(message.trim()),
          },
        }),
      );
    }
  }

  /**
   * ✅ Setup application routes
   */
  public SetupRoutes(app: Application): void {
    const employeeService = new EmployeeService(
      AppDataSource.getRepository("EntityEmployee"),
    );

    // --- Controllers
    const employeeController = new EmployeeController(employeeService);

    // Swagger UI endpoint
    app.use(`${prefix}/docs/`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // --- Register routes with prefix
    app.use(`${prefix}/employees`, employeeController.router);

    // --- Health check endpoint
    app.get(`${prefix}/health`, (_req, res) => {
      res
        .status(200)
        .json({ status: "OK", timestamp: new Date().toISOString() });
    });
  }

  /**
   * ✅ Setup centralized error handling middleware
   */
  public SetupErrorHandling(app: Application): void {
    app.use(ErrorHandler);
  }
}
