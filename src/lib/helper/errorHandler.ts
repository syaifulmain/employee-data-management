import {NextFunction, Request, Response} from "express";
import {CustomError} from "../types/error";
import {ResponseErrorBuilder} from "./response";
import loggerHandler from "./loggerHandler";

/**
 * ✅ Custom HTTP Exception
 * A standardized class for structured API errors.
 */
export class CustomHttpExceptionError extends Error {
    public readonly statusCode: number;
    public readonly detailError?: CustomError;
    public readonly timestamp: string;
    public readonly path?: string;

    constructor(
        message: string,
        statusCode = 500,
        detailError?: CustomError,
        path?: string
    ) {
        super(message);

        // Ensure prototype inheritance works correctly
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.detailError = detailError;
        this.path = path;
        this.timestamp = new Date().toISOString();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * ✅ Standardized JSON structure for API responses
     */
    toJSON() {
        return {
            success: false,
            message: this.message,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            path: this.path,
            detailError: this.detailError || null,
        };
    }
}

/**
 * ✅ Global Express Error Handler
 * Captures and formats all thrown or unhandled errors.
 */
export const ErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const isCustomError = err instanceof CustomHttpExceptionError;

    const errorObject = isCustomError
        ? err
        : new CustomHttpExceptionError(
            "Terjadi kesalahan pada server",
            500,
            err,
            req.originalUrl
        );

    const errorResponse = errorObject.toJSON();

    if (isCustomError) {
        loggerHandler.warn(`[${errorObject.timestamp}] ${req.method} ${req.originalUrl} → ${errorObject.message}`);
    } else {
        loggerHandler.error(`[${errorObject.timestamp}] ${req.method} ${req.originalUrl} → ${err.message}\n${err.stack}`);
    }

    // ✅ No need to return or await
    ResponseErrorBuilder(res, {
        ...errorResponse,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};