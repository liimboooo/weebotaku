import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// This file should be at pages/api/auth/[...nextauth].ts
export const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
