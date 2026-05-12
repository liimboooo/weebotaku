import { NextRequest } from "next/server";
import { handleError, APIError } from "@/middleware/auth";
import * as controllers from "@/controllers/api";

// GET /api/search - Full text search
export async function GET(request: NextRequest) {
  try {
    return await controllers.searchEdits(request);
  } catch (error) {
    return handleError(error);
  }
}
