import {
  RESPONSE_FAILED_DESC,
  RESPONSE_SUCCESS_DESC,
} from "../types/constanst/response";
import { ResponsePayload } from "../types/response";
import { CustomHttpExceptionError } from "./errorHandler";
import { Response } from "express";

/**
 * ✅ Build a standardized success response
 */
export function ResponseSuccessBuilder<T>(
  res: Response,
  statusCode: number,
  message = "Success",
  data?: T | null,
): void {
  sendResponse(res, RESPONSE_SUCCESS_DESC, statusCode, message, data);
}

/**
 * ✅ Build a standardized error response
 *
 * Sends the standardized response payload where `data` contains the
 * `detailError` object (if available) instead of only the error message.
 */
export function ResponseErrorBuilder(res: Response, err: unknown): void {
  // Default fallback values
  let statusCode = 500;
  let message = "Internal Server Error";
  let detailError: unknown | null = null;

  // If it's our custom error class instance, prefer its properties
  if (err instanceof CustomHttpExceptionError) {
    statusCode = err.statusCode ?? statusCode;
    message = err.message ?? message;
    detailError = err.detailError ?? null;
  } else if (err && typeof err === "object") {
    // If the handler already passed a plain object (e.g. error.toJSON()),
    // try to extract common fields.
    const e = err as any;
    statusCode = typeof e.statusCode === "number" ? e.statusCode : statusCode;
    message = typeof e.message === "string" ? e.message : message;

    // Prefer an explicit detailError, otherwise build one from name/message if present
    if (e.detailError) {
      detailError = e.detailError;
    } else if (e.name || e.message) {
      detailError = {
        name: e.name ?? "Error",
        message: e.message ?? null,
      };
    } else {
      detailError = null;
    }
  } else if (err instanceof Error) {
    // Generic Error instance
    statusCode = 500;
    message = err.message || message;
    detailError = { name: err.name, message: err.message };
  } else {
    // Non-object unknown error (e.g. string)
    detailError = { message: String(err) };
  }

  // Send the detailError object as `data` so consumers (and Swagger examples)
  // can see structured error info instead of only a message string.
  sendResponse(res, RESPONSE_FAILED_DESC, statusCode, message, detailError);
}

/**
 * ✅ Shared internal function to structure all responses
 */
function sendResponse<T>(
  res: Response,
  desc: string,
  statusCode: number,
  message: string,
  data?: T | null,
): void {
  const payload: ResponsePayload = {
    responseCode: statusCode,
    responseDesc: desc,
    message,
    data: isEmptyObject(data) ? null : (data ?? null),
  };

  res.status(statusCode).json(payload);
}

/**
 * ✅ Utility to detect empty objects
 */
function isEmptyObject(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 0 &&
    value.constructor === Object
  );
}
