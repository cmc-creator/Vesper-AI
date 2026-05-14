import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERVISOR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const {
    supervisorName,
    supervisorTitle,
    supervisorDate,
    supervisorComments,
    supervisorSignature,
  } = body as {
    supervisorName?: string;
    supervisorTitle?: string;
    supervisorDate?: string;
    supervisorComments?: string;
    supervisorSignature?: string;
  };

  const report = await prisma.incidentReport.update({
    where: { id },
    data: {
      supervisorName: supervisorName ?? null,
      supervisorTitle: supervisorTitle ?? null,
      supervisorDate: supervisorDate ? new Date(supervisorDate) : null,
      supervisorComments: supervisorComments ?? null,
      supervisorSignature: supervisorSignature ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: report.id });
}
