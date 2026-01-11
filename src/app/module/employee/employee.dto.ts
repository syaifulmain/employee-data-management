import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length
} from "class-validator"

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateEmployeeRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           example: "Alice"
 *           description: Full name of the employee
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           example: "alice@example.com"
 *           description: Email address of the employee
 *         phoneNumber:
 *           type: string
 *           maxLength: 15
 *           example: "+62111111111"
 *           description: Phone number (optional)
 *         address:
 *           type: string
 *           maxLength: 200
 *           example: "Jl. Example 45"
 *           description: Address (optional)
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: "1992-07-15"
 *           description: Date of birth (optional)
 *         position:
 *           type: string
 *           maxLength: 100
 *           example: "Marketing Manager"
 *           description: Job position/title (optional)
 */
export class CreateEmployeeRequest {
    @IsNotEmpty()
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsNotEmpty()
    @IsEmail()
    @Length(1, 100)
    email!: string;

    @IsOptional()
    @IsString()
    @Length(0, 15)
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    @Length(0, 200)
    address?: string;

    @IsOptional()
    dateOfBirth?: Date;

    @IsOptional()
    @IsString()
    @Length(0, 100)
    position?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateEmployeeRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           example: "Jane Updated"
 *           description: Full name of the employee
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           example: "jane.updated@example.com"
 *           description: Email address of the employee
 *         phoneNumber:
 *           type: string
 *           maxLength: 15
 *           example: "08123456789"
 *           description: Phone number (optional)
 *         address:
 *           type: string
 *           maxLength: 200
 *           example: "Updated Address"
 *           description: Address (optional)
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: "1990-05-20"
 *           description: Date of birth (optional)
 *         position:
 *           type: string
 *           maxLength: 100
 *           example: "Senior Software Engineer"
 *           description: Job position/title (optional)
 */
export class UpdateEmployeeRequest {
    @IsOptional()
    @IsString()
    @Length(1, 100)
    name?: string;

    @IsOptional()
    @IsEmail()
    @Length(1, 100)
    email?: string;

    @IsOptional()
    @IsString()
    @Length(0, 15)
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    @Length(0, 200)
    address?: string;

    @IsOptional()
    dateOfBirth?: Date;

    @IsOptional()
    @IsString()
    @Length(0, 100)
    position?: string;
}