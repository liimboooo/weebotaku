import winston from "winston";
import * as Sentry from "@sentry/nextjs";

// ============ WINSTON LOGGER SETUP ============

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  // Console output
  new winston.transports.Console(),

  // Error log file
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),

  // Combined log file
  new winston.transports.File({
    filename: "logs/all.log",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  levels,
  format,
  transports,
});

// ============ SENTRY INITIALIZATION ============

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("⚠️ SENTRY_DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out 404s and test errors
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          if (error.message.includes("404") || error.message.includes("test")) {
            return null;
          }
        }
      }
      return event;
    },
  });

  console.log("✅ Sentry initialized");
}

// ============ CUSTOM LOG UTILITIES ============

export const log = {
  /**
   * Log general info
   */
  info: (message: string, metadata?: any) => {
    logger.info(message);
    if (metadata) {
      console.log(metadata);
    }
  },

  /**
   * Log errors with context
   */
  error: (message: string, error?: any, metadata?: any) => {
    logger.error(message);
    if (error) {
      console.error(error);
      Sentry.captureException(error, {
        extra: metadata,
      });
    }
  },

  /**
   * Log warnings
   */
  warn: (message: string, metadata?: any) => {
    logger.warn(message);
    if (metadata) {
      console.log(metadata);
    }
  },

  /**
   * Log API requests
   */
  api: (method: string, path: string, statusCode: number, duration: number) => {
    const statusEmoji = statusCode < 400 ? "✅" : statusCode < 500 ? "⚠️" : "❌";
    logger.http(
      `${statusEmoji} [${method}] ${path} - ${statusCode} (${duration}ms)`
    );
  },

  /**
   * Log database operations
   */
  database: (operation: string, table: string, duration: number) => {
    if (duration > 1000) {
      logger.warn(
        `🐌 Slow DB query: [${operation}] ${table} (${duration}ms)`
      );
    } else {
      logger.debug(`[${operation}] ${table} (${duration}ms)`);
    }
  },

  /**
   * Log cache operations
   */
  cache: (operation: string, key: string, hit: boolean) => {
    const icon = hit ? "💚" : "💔";
    logger.debug(`${icon} Cache ${operation}: ${key}`);
  },

  /**
   * Log performance metrics
   */
  performance: (metric: string, value: number, unit = "ms") => {
    logger.info(`📊 ${metric}: ${value}${unit}`);
  },

  /**
   * Log user actions (for audit trail)
   */
  audit: (userId: string, action: string, resource: string, metadata?: any) => {
    logger.info(`🔐 [AUDIT] User ${userId} ${action} ${resource}`);
    if (metadata) {
      console.log(metadata);
    }
  },

  /**
   * Log security events
   */
  security: (event: string, severity: "low" | "medium" | "high", metadata?: any) => {
    const icon = severity === "high" ? "🚨" : severity === "medium" ? "⚠️" : "ℹ️";
    logger.warn(`${icon} [SECURITY] ${event} (${severity})`);
    if (metadata) {
      console.log(metadata);
      Sentry.captureMessage(`Security Event: ${event}`, "warning");
    }
  },
};

// ============ NEXT.JS MIDDLEWARE FOR LOGGING ============

export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  error?: any
) {
  if (error) {
    log.error(`API Error: [${method}] ${path}`, error, { statusCode });
  } else {
    log.api(method, path, statusCode, duration);
  }
}

export function logDatabaseQuery(
  operation: string,
  table: string,
  duration: number
) {
  log.database(operation, table, duration);
}

export function captureException(error: Error, context?: any) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export default logger;
