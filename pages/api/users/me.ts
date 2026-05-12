import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, APIError } from "@/middleware/auth";
import * as controllers from "@/controllers/api";

// GET /api/users/me - Get current user
export async function GET(request: NextRequest) {
  try {
    return await controllers.getCurrentUser(request);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/users/me - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    return await controllers.updateUserProfile(request);
  } catch (error) {
    return handleError(error);
  }
}
