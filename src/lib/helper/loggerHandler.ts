import {createLogger, format, transports, Logger} from "winston";

// --- Determine environment
const isProduction = process.env.NODE_ENV === "production";


// --- Helper: Flatten multiline log messages
const sanitizeMessage = (msg: unknown): string => {
    if (!msg) return "";
    const str = typeof msg === "string" ? msg : JSON.stringify(msg);
    return str
        .replace(/\n/g, " ") // remove newlines
        .replace(/\s\s+/g, " ") // collapse multiple spaces
        .trim();
};

// --- Define base log format
const logFormat = format.printf(({level, message, timestamp}) => {
    const cleanMessage = sanitizeMessage(message);
    return `${timestamp} [${level.toUpperCase()}]: ${cleanMessage}`;
});

// --- Winston logger configuration
const logger = createLogger({
    level: isProduction ? "info" : "debug",
    format: format.combine(
        format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
        format.errors({stack: true}),
        logFormat
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
                logFormat
            ),
        })
    ],
});

// ✅ Optional: Stream interface for HTTP request logging (morgan integration)
(logger as Logger & {
    httpStream: { write: (message: string) => void };
}).httpStream = {
    write: (message: string) => {
        logger.info(sanitizeMessage(message));
    },
};

export default logger;