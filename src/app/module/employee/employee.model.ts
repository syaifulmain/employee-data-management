import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *           description: Unique identifier for the employee
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: "Jane Doe"
 *           description: Full name of the employee
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           example: "jane.doe@example.com"
 *           description: Unique email address of the employee
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *           maxLength: 15
 *           example: "08123456789"
 *           description: Phone number (optional)
 *         address:
 *           type: string
 *           nullable: true
 *           maxLength: 200
 *           example: "123 Main St, Jakarta"
 *           description: Address of the employee (optional)
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "1990-05-20"
 *           description: Date of birth (optional)
 *         position:
 *           type: string
 *           nullable: true
 *           maxLength: 100
 *           example: "Software Engineer"
 *           description: Job position/title (optional)
 *       required:
 *         - id
 *         - name
 *         - email
 */
@Entity({ name: "employees" })
export class EntityEmployee {
    @PrimaryGeneratedColumn({ type: "int", name: "id" })
    id!: number;

    @Column({ type: "varchar", length: 100 })
    name!: string;

    @Column({ type: "varchar", length: 100, unique: true })
    email!: string;

    @Column({ type: "varchar", length: 15, nullable: true })
    phoneNumber: string | null = null;

    @Column({ type: "varchar", length: 200, nullable: true })
    address: string | null = null;

    @Column({ type: "date", nullable: true })
    dateOfBirth: Date | null = null;

    @Column({ type: "varchar", length: 100, nullable: true })
    position: string | null = null;
}
