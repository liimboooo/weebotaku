import { NextRequest, NextResponse } from "next/server";
import helmet from "helmet";
import argon2 from "argon2";
import { log } from "@/lib/logger";

// ============ HELMET SECURITY MIDDLEWARE ============

export function withSecurityHeaders(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    const response = await handler(request, context);

    // Security headers
    response.headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );
    response.headers.set(
      "X-Frame-Options",
      "DENY"
    );
    response.headers.set(
      "X-XSS-Protection",
      "1; mode=block"
    );
    response.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https:"
    );

    return response;
  };
}

// ============ ARGON2 PASSWORD HASHING ============

export class PasswordService {
  private static readonly HASH_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 2 ** 15, // 32 MB
    timeCost: 3,
    parallelism: 1,
  };

  /**
   * Hash a password using Argon2
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const hash = await argon2.hash(password, this.HASH_OPTIONS);
      return hash;
    } catch (error) {
      log.error("Password hashing failed", error);
      throw error;
    }
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      log.error("Password verification failed", error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain lowercase letters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain uppercase letters");
    }
    if (!/\d/.test(password)) {
      errors.push("Password must contain numbers");
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push("Password must contain special characters (@$!%*?&)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a random secure password
   */
  static generateSecurePassword(length = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "@$!%*?&";
    const all = uppercase + lowercase + numbers + special;

    let password = "";
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));

    for (let i = password.length; i < length; i++) {
      password += all.charAt(Math.floor(Math.random() * all.length));
    }

    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Check if password was recently changed (for password history)
   */
  static shouldRejectPasswordReuse(
    newPassword: string,
    oldHash: string
  ): Promise<boolean> {
    return this.verifyPassword(newPassword, oldHash);
  }
}

// ============ INPUT SANITIZATION & VALIDATION ============

export class InputValidator {
  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string, maxLength = 1000): string {
    if (typeof input !== "string") {
      return "";
    }

    return input
      .slice(0, maxLength)
      .trim()
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/[&]/g, "&amp;") // Escape ampersands
      .replace(/["']/g, ""); // Remove quotes
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JSON string
   */
  static validateJson(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prevent SQL injection by validating input patterns
   */
  static preventSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|SCRIPT)\b)/i,
      /(-{2}|\/\*|\*\/|xp_|sp_)/,
      /(;|\||&)/,
    ];

    return !sqlPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Rate limit key based on IP and endpoint
   */
  static generateRateLimitKey(
    ip: string,
    endpoint: string,
    userId?: string
  ): string {
    return userId
      ? `ratelimit:${userId}:${endpoint}`
      : `ratelimit:${ip}:${endpoint}`;
  }
}

// ============ CORS SECURITY ============

export function isTrustedOrigin(origin: string): boolean {
  const trustedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);

  return trustedOrigins.includes(origin);
}

export function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": isTrustedOrigin(origin) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
  };
}

// ============ RATE LIMITING UTILITIES ============

export class RateLimiter {
  private static store = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * Check if request is rate limited
   */
  static isLimited(
    key: string,
    maxRequests: number,
    windowMs: number
  ): boolean {
    const now = Date.now();
    const record = this.store.get(key);

    // Clean up expired entries
    if (record && record.resetTime < now) {
      this.store.delete(key);
    }

    const current = this.store.get(key) || {
      count: 0,
      resetTime: now + windowMs,
    };

    if (current.count >= maxRequests) {
      return true;
    }

    current.count++;
    this.store.set(key, current);

    return false;
  }

  /**
   * Get retry-after time in seconds
   */
  static getRetryAfter(key: string): number {
    const record = this.store.get(key);
    if (!record) return 0;

    const secondsUntilReset = Math.ceil((record.resetTime - Date.now()) / 1000);
    return Math.max(0, secondsUntilReset);
  }

  /**
   * Clear rate limit for key
   */
  static clear(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all rate limits (for testing)
   */
  static clearAll(): void {
    this.store.clear();
  }
}

export default {
  withSecurityHeaders,
  PasswordService,
  InputValidator,
  isTrustedOrigin,
  corsHeaders,
  RateLimiter,
};
