import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, IncidentLevel } from "@prisma/client";

const ALLOWED_LEVELS = Object.values(IncidentLevel);

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

  // Only accept known QM review fields
  const {
    reviewedByName,
    reviewedByDate,
    incidentLevel,
    qmReviewInitials,
    qmComments,
    qmSignature,
  } = body as {
    reviewedByName?: string;
    reviewedByDate?: string;
    incidentLevel?: string;
    qmReviewInitials?: string;
    qmComments?: string;
    qmSignature?: string;
  };

  if (incidentLevel && !ALLOWED_LEVELS.includes(incidentLevel as IncidentLevel)) {
    return NextResponse.json({ error: "Invalid incident level" }, { status: 400 });
  }

  const report = await prisma.incidentReport.update({
    where: { id },
    data: {
      reviewedByName: reviewedByName ?? null,
      reviewedByDate: reviewedByDate ? new Date(reviewedByDate) : null,
      incidentLevel: (incidentLevel as IncidentLevel) ?? null,
      qmReviewInitials: qmReviewInitials ?? null,
      qmComments: qmComments ?? null,
      qmSignature: qmSignature ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: report.id });
}
