import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse, handleError, APIError } from "@/middleware/auth";
import * as controllers from "@/controllers/api";

// GET /api/edits/[editId] - Get single edit
export async function GET(
  request: NextRequest,
  { params }: { params: { editId: string } }
) {
  try {
    return await controllers.getEditById(request, { params });
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/edits/[editId] - Update edit
export async function PUT(
  request: NextRequest,
  { params }: { params: { editId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const body = await request.json();
    const { title, description, tags, categoryIds } = body;

    const edit = await prisma.edit.findUnique({
      where: { id: params.editId },
      select: { creatorId: true },
    });

    if (!edit) {
      throw new APIError(404, "Edit not found", "EDIT_NOT_FOUND");
    }

    if (edit.creatorId !== session.user.id) {
      throw new APIError(403, "Forbidden", "FORBIDDEN");
    }

    const updatedEdit = await prisma.edit.update({
      where: { id: params.editId },
      data: {
        ...(title && { title }),
        ...(description && { description: description.slice(0, 5000) }),
        ...(tags && { tags }),
        ...(categoryIds && {
          categories: {
            set: categoryIds.map((id: string) => ({ id })),
          },
        }),
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        categories: true,
      },
    });

    return createSuccessResponse(updatedEdit, "Edit updated successfully");
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/edits/[editId] - Delete edit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { editId: string } }
) {
  try {
    return await controllers.deleteEdit(request, { params });
  } catch (error) {
    return handleError(error);
  }
}
