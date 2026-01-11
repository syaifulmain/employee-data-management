import {CustomHttpExceptionError} from "./errorHandler";

/** ✅ Helper: Ensure payload is not empty */
export function ensurePayloadNotEmpty(payload: object): void {
    if (!payload || Object.keys(payload).length === 0) {
        throw new CustomHttpExceptionError("Update payload cannot be empty", 400);
    }
}