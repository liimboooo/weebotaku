import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse, handleError, APIError, validateRequest } from "@/middleware/auth";
import * as controllers from "@/controllers/api";

// GET /api/edits - Get feed
export async function GET(request: NextRequest) {
  try {
    return await controllers.getEditsForFeed(request);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/edits - Create new edit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const body = await request.json();
    return await controllers.createEdit(request);
  } catch (error) {
    return handleError(error);
  }
}
