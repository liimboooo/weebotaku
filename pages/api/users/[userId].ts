import { NextRequest } from "next/server";
import { handleError, APIError } from "@/middleware/auth";
import * as controllers from "@/controllers/api";

// GET /api/users/[userId] - Get public user profile
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    return await controllers.getUserProfile(request, { params });
  } catch (error) {
    return handleError(error);
  }
}
