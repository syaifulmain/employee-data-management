import { DataSource } from "typeorm";

export async function seedDatabase(AppDataSource: DataSource) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        console.log("🚀 Running auto seed...");

        // --- EMPLOYEE SEED ---
        const employeeCount = await queryRunner.query(`SELECT COUNT(*) FROM "employees"`);
        if (Number(employeeCount[0].count) === 0) {
            await queryRunner.query(`
                INSERT INTO "employees" (name, email, "phoneNumber", address, "dateOfBirth", "position") VALUES
                ('John Doe', 'john.doe@example.com', '1234567890', '123 Main St', '1985-01-01', 'Software Engineer'),
                ('Jane Smith', 'jane.smith@example.com', NULL, '456 Oak Ave', '1990-05-12', 'Product Manager'),
                ('Bob Johnson', 'bob.j@example.com', '0987654321', NULL, NULL, 'Designer'),
            `);
            console.log("✅ Employees seeded successfully.");
        } else {
            console.log("✅ Employees already exist — skipping seed.");
        }

        console.log("🎉 Auto seed completed.");
    } catch (err) {
        console.error("❌ Seeder error:", err);
    } finally {
        await queryRunner.release();
    }
}
