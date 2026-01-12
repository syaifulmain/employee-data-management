import { Repository } from "typeorm";
import { EntityEmployee } from "./employee.model";
import { CreateEmployeeRequest, UpdateEmployeeRequest } from "./employee.dto";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { emailService } from "../../../lib/services/email.service";
import loggerHandler from "../../../lib/helper/loggerHandler";

export class EmployeeService {
  constructor(
    private readonly employeeRepository: Repository<EntityEmployee>,
  ) {}

  /**
   * Get all employee data (optionally filter by name)
   */
  async getAllData(name?: string) {
    const qb = this.employeeRepository.createQueryBuilder("employee");

    if (name && name.trim() !== "") {
      // case-insensitive search on name using parameterized LIKE to avoid injection
      qb.where("LOWER(employee.name) LIKE :name", { name: `%${name.toLowerCase()}%` });
    }

    return qb.getMany();
  }

  /**
   * Get employee data by ID
   */
  async getDetailData(id: number): Promise<EntityEmployee | null> {
    const employee = await this.employeeRepository
      .createQueryBuilder("employee")
      .where("id = :id", { id })
      .getOne();

    if (!employee) {
      return null;
    }

    return employee;
  }

  /**
   * Create new employee data
   */
  async createData(payload: CreateEmployeeRequest) {
    const newEmployee = this.employeeRepository.create(payload);
    const savedEmployee = await this.employeeRepository.save(newEmployee);

    // Send welcome email (non-blocking)
    if (emailService.isReady()) {
      emailService.sendWelcomeEmail(savedEmployee.email, savedEmployee.name)
        .catch(error => {
          loggerHandler.error(`Failed to send welcome email to ${savedEmployee.email}: ${error.message}`);
        });
    }

    return savedEmployee;
  }

  /**
   * Update existing employee data
   */
  async updateData(id: number, payload: UpdateEmployeeRequest) {
    await this.employeeRepository.update(id, payload);
    return this.employeeRepository.findOneBy({ id });
  }

  /**
   * Delete employee data
   */
  async deleteData(id: number) {
    return this.employeeRepository.delete(id);
  }

  /**
   * Export all employee data
   */
  async exportData(): Promise<any[]> {
    const employees = await this.employeeRepository.find();

    return employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber || "",
      address: employee.address || "",
      dateOfBirth: employee.dateOfBirth
        ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
        : "",
      position: employee.position || "",
    }));
  }

  /**
   * Import employee data from array
   */
  async importData(
    data: any[],
  ): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; data: any; error: string }>;
  }> {
    const result = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; data: any; error: string }>,
    };

    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];
      const rowNumber = i + 2; // +2 because row 1 is header and array is 0-indexed

      try {
        // Validate required fields
        if (!rowData.name || !rowData.email) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            data: rowData,
            error: "Name and email are required",
          });
          continue;
        }

        // Check if email already exists
        const existingEmployee = await this.employeeRepository.findOne({
          where: { email: rowData.email },
        });

        if (existingEmployee) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            data: rowData,
            error: "Email already exists",
          });
          continue;
        }

        // Transform and validate using DTO
        const employeeDto = plainToClass(CreateEmployeeRequest, {
          name: rowData.name,
          email: rowData.email,
          phoneNumber: rowData.phoneNumber || null,
          address: rowData.address || null,
          dateOfBirth: rowData.dateOfBirth
            ? new Date(rowData.dateOfBirth)
            : null,
          position: rowData.position || null,
        });

        const errors = await validate(employeeDto);
        if (errors.length > 0) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            data: rowData,
            error: errors.map((e) => Object.values(e.constraints || {})).join(", "),
          });
          continue;
        }

        // Create and save employee
        await this.createData(employeeDto);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          data: rowData,
          error: error.message || "Unknown error",
        });
      }
    }

    return result;
  }
}
