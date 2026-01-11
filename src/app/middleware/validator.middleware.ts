import {plainToInstance} from "class-transformer";
import {validate, ValidationError} from "class-validator";
import {Request, Response, NextFunction} from "express";
import {CustomHttpExceptionError} from "../../lib/helper/errorHandler";
import {ResponseErrorBuilder} from "../../lib/helper/response";
import loggerHandler from "../../lib/helper/loggerHandler";

/**
 * ✅ Express middleware for validating incoming request bodies using class-validator
 *
 * @param dtoClass - The DTO (class) to validate against
 * @returns Express middleware function
 */
function ValidatorMiddleware<T extends object>(dtoClass: new () => T) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Convert plain request body to class instance
            const dto = plainToInstance(dtoClass, req.body);

            // Perform validation
            const errors = await validate(dto, {
                whitelist: true,          // remove non-decorated properties
                forbidNonWhitelisted: true, // throw error for extra fields
                skipMissingProperties: false,
            });

            if (errors.length > 0) {
                // Extract and format validation errors
                const errorMessages = extractValidationMessages(errors);
                loggerHandler.warn(`[VALIDATION] ❌ Validation failed for ${req.originalUrl}: ${errorMessages.join("; ")}`);

                throw new CustomHttpExceptionError(errorMessages.join(", "), 400);
            }

            // Continue if validation passes
            return next();
        } catch (error: any) {
            loggerHandler.error(`[VALIDATION] ⚠️ Error validating request: ${error.message}`);
            return ResponseErrorBuilder(res, error);
        }
    };
}

/**
 * ✅ Recursively extracts error messages from class-validator results
 */
function extractValidationMessages(errors: ValidationError[], parentPath = ""): string[] {
    const messages: string[] = [];

    for (const error of errors) {
        const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;

        if (error.constraints) {
            // Collect messages for the current property
            for (const message of Object.values(error.constraints)) {
                messages.push(`${propertyPath}: ${message}`);
            }
        }

        // Handle nested validation (e.g., nested objects or arrays)
        if (error.children && error.children.length > 0) {
            messages.push(...extractValidationMessages(error.children, propertyPath));
        }
    }

    return messages;
}

export default ValidatorMiddleware;