import { Router } from "express";
import { ResponseSuccessBuilder } from "../../../lib/helper/response";
import { EmployeeService } from "./employee.service";
import { CustomHttpExceptionError } from "../../../lib/helper/errorHandler";
import { CreateEmployeeRequest, UpdateEmployeeRequest } from "./employee.dto";
import { uploadMiddleware } from "../../middleware/upload.middleware";
import * as XLSX from "xlsx";
import { format } from "fast-csv";
import csvParser from "csv-parser";
import { emailService } from "../../../lib/services/email.service";
import loggerHandler from "../../../lib/helper/loggerHandler";
import path from "path";

/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: Employee management API
 */

export class EmployeeController {
  public router: Router;
  private employeeService: EmployeeService;

  constructor(employeeService: EmployeeService) {
    this.router = Router();
    this.employeeService = employeeService;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Export routes (must be before /:id to avoid route collision)
    this.router.get("/export/csv", this.exportToCSV);
    this.router.get("/export/excel", this.exportToExcel);

    // Template download routes
    this.router.get("/template/csv", this.downloadTemplateCSV);
    this.router.get("/template/excel", this.downloadTemplateExcel);

    // Import routes
    this.router.post(
      "/import/csv",
      uploadMiddleware.single("file"),
      this.importFromCSV,
    );
    this.router.post(
      "/import/excel",
      uploadMiddleware.single("file"),
      this.importFromExcel,
    );

    // CRUD routes
    this.router.get("/", this.getAllData);
    this.router.get("/:id", this.getDetailData);
    this.router.post("/", this.createData);
    this.router.put("/:id", this.updateData);
    this.router.delete("/:id", this.deleteData);
  }

  /**
   * @swagger
   * /employees:
   *   get:
   *     summary: Get all employees
   *     tags: [Employee]
   *     parameters:
   *       - in: query
   *         name: name
   *         schema:
   *           type: string
   *         required: false
   *         description: Filter employees by name (case-insensitive, partial match)
   *         example: "john"
   *     responses:
   *       200:
   *         description: Employees retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 responseCode:
   *                   type: integer
   *                 responseDesc:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Employee'
   *             example:
   *               responseCode: 200
   *               responseDesc: "Successful"
   *               message: "Employees retrieved successfully"
   *               data:
   *                 - id: 1
   *                   name: "Jane Doe"
   *                   email: "jane.doe@example.com"
   *                   phoneNumber: "08123456789"
   *                   address: "123 Main St, Jakarta"
   *                   dateOfBirth: "1990-05-20"
   *                   position: "Software Engineer"
   *                 - id: 2
   *                   name: "John Smith"
   *                   email: "john.smith@example.com"
   *                   phoneNumber: null
   *                   address: null
   *                   dateOfBirth: null
   *                   position: null
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 500
   *               responseDesc: "Failed"
   *               message: "Internal Server Error"
   *               data: null
   */

  getAllData = async (req, res, next) => {
    try {
      // accept optional `name` query parameter for searching by name
      const nameQuery = typeof req.query.name === "string" ? req.query.name : undefined;
      const employees = await this.employeeService.getAllData(nameQuery);
      ResponseSuccessBuilder(
        res,
        200,
        "Employees retrieved successfully",
        employees,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/{id}:
   *   get:
   *     summary: Get employee by ID
   *     tags: [Employee]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Employee ID
   *     responses:
   *       200:
   *         description: Employee retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 responseCode:
   *                   type: integer
   *                 responseDesc:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Employee'
   *             example:
   *               responseCode: 200
   *               responseDesc: "Successful"
   *               message: "Employee retrieved successfully"
   *               data:
   *                 id: 1
   *                 name: "Jane Doe"
   *                 email: "jane.doe@example.com"
   *                 phoneNumber: "08123456789"
   *                 address: "123 Main St, Jakarta"
   *                 dateOfBirth: "1990-05-20"
   *                 position: "Software Engineer"
   *       404:
   *         description: Employee not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 responseCode:
   *                   type: integer
   *                 responseDesc:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   type: string
   *                   nullable: true
   *             example:
   *               responseCode: 404
   *               responseDesc: "Failed"
   *               message: "Employee not found"
   *               data: null
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 500
   *               responseDesc: "Failed"
   *               message: "Internal Server Error"
   *               data: null
   */

  getDetailData = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const employee = await this.employeeService.getDetailData(id);
      if (!employee) {
        throw new CustomHttpExceptionError("Employee not found", 404);
      }
      ResponseSuccessBuilder(
        res,
        200,
        "Employee retrieved successfully",
        employee,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees:
   *   post:
   *     summary: Create a new employee
   *     tags: [Employee]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateEmployeeRequest'
   *           example:
   *             name: "Alice"
   *             email: "alice@example.com"
   *             phoneNumber: "+62111111111"
   *             address: "Jl. Example 45"
   *             dateOfBirth: "1992-07-15"
   *             position: "Marketing Manager"
   *     responses:
   *       201:
   *         description: Employee created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 responseCode:
   *                   type: integer
   *                 responseDesc:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Employee'
   *             example:
   *               responseCode: 201
   *               responseDesc: "Successful"
   *               message: "Employee created successfully"
   *               data:
   *                 id: 3
   *                 name: "Alice"
   *                 email: "alice@example.com"
   *                 phoneNumber: "+62111111111"
   *                 address: "Jl. Example 45"
   *                 dateOfBirth: "1992-07-15"
   *                 position: "Marketing Manager"
   *       400:
   *         description: Bad request
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 400
   *               responseDesc: "Failed"
   *               message: "Validation error: email must be a valid email"
   *               data: null
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 500
   *               responseDesc: "Failed"
   *               message: "Internal Server Error"
   *               data: null
   */

  createData = async (req, res, next) => {
    try {
      const payload: CreateEmployeeRequest = req.body;
      const newEmployee = await this.employeeService.createData(payload);
      ResponseSuccessBuilder(
        res,
        201,
        "Employee created successfully",
        newEmployee,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/{id}:
   *   put:
   *     summary: Update employee by ID
   *     tags: [Employee]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Employee ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateEmployeeRequest'
   *           example:
   *             name: "Jane Updated"
   *             email: "jane.updated@example.com"
   *             phoneNumber: "08123456789"
   *             address: "Updated Address"
   *             dateOfBirth: "1990-05-20"
   *             position: "Senior Software Engineer"
   *     responses:
   *       200:
   *         description: Employee updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 responseCode:
   *                   type: integer
   *                 responseDesc:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Employee'
   *             example:
   *               responseCode: 200
   *               responseDesc: "Successful"
   *               message: "Employee updated successfully"
   *               data:
   *                 id: 1
   *                 name: "Jane Updated"
   *                 email: "jane.updated@example.com"
   *                 phoneNumber: "08123456789"
   *                 address: "Updated Address"
   *                 dateOfBirth: "1990-05-20"
   *                 position: "Senior Software Engineer"
   *       404:
   *         description: Employee not found
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 404
   *               responseDesc: "Failed"
   *               message: "Employee not found"
   *               data: null
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 500
   *               responseDesc: "Failed"
   *               message: "Internal Server Error"
   *               data: null
   */

  updateData = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const payload: UpdateEmployeeRequest = req.body;
      const updatedEmployee = await this.employeeService.updateData(
        id,
        payload,
      );
      if (!updatedEmployee) {
        throw new CustomHttpExceptionError("Employee not found", 404);
      }
      ResponseSuccessBuilder(
        res,
        200,
        "Employee updated successfully",
        updatedEmployee,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/{id}:
   *   delete:
   *     summary: Delete employee by ID
   *     tags: [Employee]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Employee ID
   *     responses:
   *       200:
   *         description: Employee deleted successfully
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 200
   *               responseDesc: "Successful"
   *               message: "Employee deleted successfully"
   *               data: null
   *       404:
   *         description: Employee not found
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 404
   *               responseDesc: "Failed"
   *               message: "Employee not found"
   *               data: null
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             example:
   *               responseCode: 500
   *               responseDesc: "Failed"
   *               message: "Internal Server Error"
   *               data: null
   */

  deleteData = async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      await this.employeeService.deleteData(id);
      ResponseSuccessBuilder(res, 200, "Employee deleted successfully");
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/export/csv:
   *   get:
   *     summary: Export all employees to CSV
   *     tags: [Employee]
   *     responses:
   *       200:
   *         description: CSV file download
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   *       500:
   *         description: Internal server error
   */
  exportToCSV = async (_req, res, next) => {
    try {
      const employees = await this.employeeService.exportData();

      // Generate timestamp for filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")
        .join("_")
        .split(".")[0];

      const filename = `employees_export_${timestamp}.csv`;

      // Set response headers
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      // Create CSV stream
      const csvStream = format({ headers: true });
      csvStream.pipe(res);

      // Write data
      employees.forEach((employee) => {
        csvStream.write(employee);
      });

      csvStream.end();
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/export/excel:
   *   get:
   *     summary: Export all employees to Excel
   *     tags: [Employee]
   *     responses:
   *       200:
   *         description: Excel file download
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema:
   *               type: string
   *               format: binary
   *       500:
   *         description: Internal server error
   */
  exportToExcel = async (_req, res, next) => {
    try {
      const employees = await this.employeeService.exportData();

      // Generate timestamp for filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")
        .join("_")
        .split(".")[0];

      const filename = `employees_export_${timestamp}.xlsx`;

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(employees);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // Set response headers
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      // Send buffer
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/import/csv:
   *   post:
   *     summary: Import employees from CSV file
   *     tags: [Employee]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Import result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 responseCode:
   *                   type: integer
   *                 responseDesc:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     imported:
   *                       type: integer
   *                     failed:
   *                       type: integer
   *                     errors:
   *                       type: array
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  importFromCSV = async (req, res, next) => {
    try {
      if (!req.file) {
        throw new CustomHttpExceptionError("No file uploaded", 400);
      }

      // Parse CSV from buffer
      const results = [];
      const stream = require("stream");
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);

      await new Promise((resolve, reject) => {
        bufferStream
          .pipe(csvParser())
          .on("data", (data) => results.push(data))
          .on("end", resolve)
          .on("error", reject);
      });

      if (results.length === 0) {
        throw new CustomHttpExceptionError("CSV file is empty", 400);
      }

      // Import data
      const importResult = await this.employeeService.importData(results);

      // Send email notification to admin (non-blocking)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && emailService.isReady()) {
        emailService.sendImportNotification(adminEmail, {
          imported: importResult.imported,
          failed: importResult.failed,
          totalRecords: results.length
        }).catch(error => {
          loggerHandler.error(`Failed to send import notification: ${error.message}`);
        });
      }

      const message =
        importResult.failed > 0
          ? `Import completed with some errors. Imported: ${importResult.imported}, Failed: ${importResult.failed}`
          : `Successfully imported ${importResult.imported} employees`;

      ResponseSuccessBuilder(res, 200, message, importResult);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/import/excel:
   *   post:
   *     summary: Import employees from Excel file
   *     tags: [Employee]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Import result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 responseCode:
   *                   type: integer
   *                 responseDesc:
   *                   type: string
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     imported:
   *                       type: integer
   *                     failed:
   *                       type: integer
   *                     errors:
   *                       type: array
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  importFromExcel = async (req, res, next) => {
    try {
      if (!req.file) {
        throw new CustomHttpExceptionError("No file uploaded", 400);
      }

      // Read Excel file from buffer
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new CustomHttpExceptionError("Excel file is empty", 400);
      }

      // Import data
      const importResult = await this.employeeService.importData(data);

      // Send email notification to admin (non-blocking)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && emailService.isReady()) {
        emailService.sendImportNotification(adminEmail, {
          imported: importResult.imported,
          failed: importResult.failed,
          totalRecords: data.length
        }).catch(error => {
          loggerHandler.error(`Failed to send import notification: ${error.message}`);
        });
      }

      const message =
        importResult.failed > 0
          ? `Import completed with some errors. Imported: ${importResult.imported}, Failed: ${importResult.failed}`
          : `Successfully imported ${importResult.imported} employees`;

      ResponseSuccessBuilder(res, 200, message, importResult);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/template/csv:
   *   get:
   *     summary: Download CSV import template
   *     tags: [Employee]
   *     responses:
   *       200:
   *         description: CSV template file download
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   *       404:
   *         description: Template file not found
   *       500:
   *         description: Internal server error
   */
  downloadTemplateCSV = async (_req, res, next) => {
    try {
      const templatePath = path.join(process.cwd(), "public", "template_import.csv");

      // Check if file exists
      const fs = require("fs");
      if (!fs.existsSync(templatePath)) {
        throw new CustomHttpExceptionError("Template file not found", 404);
      }

      // Set response headers
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="template_import.csv"');

      // Send file
      res.sendFile(templatePath);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /employees/template/excel:
   *   get:
   *     summary: Download Excel import template
   *     tags: [Employee]
   *     responses:
   *       200:
   *         description: Excel template file download
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Template file not found
   *       500:
   *         description: Internal server error
   */
  downloadTemplateExcel = async (_req, res, next) => {
    try {
      const templatePath = path.join(process.cwd(), "public", "template_import.xlsx");

      // Check if file exists
      const fs = require("fs");
      if (!fs.existsSync(templatePath)) {
        throw new CustomHttpExceptionError("Template file not found", 404);
      }

      // Set response headers
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", 'attachment; filename="template_import.xlsx"');

      // Send file
      res.sendFile(templatePath);
    } catch (error) {
      next(error);
    }
  };
}
