import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateUploadSignature } from "@/lib/cloudinary";
import { createSuccessResponse, APIError, handleError } from "@/middleware/auth";

// POST /api/edits/upload/signature - Get signed upload URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const signature = generateUploadSignature();
    return createSuccessResponse(signature, "Upload signature generated", 200);
  } catch (error) {
    return handleError(error);
  }
}

// OPTIONS - CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}
