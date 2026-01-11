import {rateLimit, RateLimitRequestHandler} from "express-rate-limit";
import {CustomHttpExceptionError} from "../../lib/helper/errorHandler";
import loggerHandler from "../../lib/helper/loggerHandler";

/**
 * ✅ Rate Limiter Middleware Factory
 *
 * @param windowMs - Time window in milliseconds (e.g., 15 * 60 * 1000 for 15 minutes)
 * @param maxRequests - Maximum number of allowed requests per IP within the time window
 * @param message - Optional custom message for rate limit responses
 *
 * @returns Express-compatible rate limiter middleware
 */
export const LimiterMiddleware = (
    windowMs: number,
    maxRequests: number,
    message = "Too many requests — please try again later."
): RateLimitRequestHandler => {
    return rateLimit({
        windowMs,
        max: maxRequests, // exact limit per IP
        standardHeaders: true, // enables modern `RateLimit-*` headers
        legacyHeaders: false, // disables deprecated `X-RateLimit-*` headers

        keyGenerator: (req) => {
            // Use IP + path as the unique key to rate-limit per route
            const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
            return `${ip}:${req.originalUrl}`;
        },

        handler: (req, _res, next, options) => {
            loggerHandler.warn(
                `[RATE LIMIT] Too many requests: IP=${req.ip}, URL=${req.originalUrl}, window=${options.windowMs}ms, limit=${options.limit}`
            );
            next(new CustomHttpExceptionError(message, 429));
        },

        skipFailedRequests: false, // count failed requests
        skipSuccessfulRequests: false, // count all requests
    });
};