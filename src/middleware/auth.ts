import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";

// ============ AUTH MIDDLEWARE ============
export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized - Please login" },
      { status: 401 }
    );
  }

  return { session, user: session.user };
}

export async function getAuthSession(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

export function withAuth(handler: Function) {
  return async (request: NextRequest, context: any) => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    return handler(request, { ...context, session });
  };
}

// ============ RATE LIMITING ============
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  handler: Function,
  options: {
    windowMs?: number; // milliseconds
    maxRequests?: number;
    keyGenerator?: (req: NextRequest) => string;
  } = {}
) {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 10,
    keyGenerator = (req) => {
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      return `${ip}:${req.nextUrl.pathname}`;
    },
  } = options;

  return async (request: NextRequest, context: any) => {
    const key = keyGenerator(request);
    const now = Date.now();
    const record = rateLimitStore.get(key);

    // Clean up expired entries
    if (record && record.resetTime < now) {
      rateLimitStore.delete(key);
    }

    // Initialize or update record
    const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

    if (current.count >= maxRequests) {
      return NextResponse.json(
        { error: "Too many requests - Please try again later" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((current.resetTime - now) / 1000)) } }
      );
    }

    current.count++;
    rateLimitStore.set(key, current);

    return handler(request, context);
  };
}

// ============ CORS MIDDLEWARE ============
export function withCORS(handler: Function, allowedOrigins: string[] = []) {
  return async (request: NextRequest, context: any) => {
    const origin = request.headers.get("origin") || "";
    const allowedOriginsList = [
      ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
      "http://localhost:3000",
      "http://localhost:3001",
      ...allowedOrigins,
    ];

    const response = await handler(request, context);

    if (allowedOriginsList.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
    }

    return response;
  };
}

// ============ ERROR HANDLER ============
export class APIError extends Error {
  constructor(
    public statusCode: number = 500,
    public message: string = "Internal Server Error",
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function handleError(error: any) {
  console.error("API Error:", error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error.code === "P2025") {
    // Prisma record not found
    return NextResponse.json(
      {
        error: "Resource not found",
        code: "NOT_FOUND",
      },
      { status: 404 }
    );
  }

  if (error.code === "P2002") {
    // Prisma unique constraint violation
    return NextResponse.json(
      {
        error: "Resource already exists",
        code: "ALREADY_EXISTS",
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      error: "Internal Server Error",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}

// ============ VALIDATION HELPERS ============
export function validateRequest(
  data: any,
  schema: Record<string, { type: string; required?: boolean }>
) {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && !value) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value && typeof value !== rules.type) {
      errors.push(`${field} must be of type ${rules.type}`);
    }
  }

  return errors;
}

export function createErrorResponse(
  statusCode: number,
  message: string,
  data?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(data && { data }),
    },
    { status: statusCode }
  );
}

export function createSuccessResponse(
  data: any,
  message: string = "Success",
  statusCode: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode }
  );
}
