import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Employee Data Management API",
      version: "1.0.0",
      description: "API for managing employee records",
    },
    servers: [
      {
        url: "http://localhost:3001/api/v1",
        description: "Local Development",
      },
    ],
  },
  // Scan route files for JSDoc @swagger tags
  apis: ["./src/app/module/**/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
