import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.incidentReport.findMany({
    include: { patient: true, reportedBy: { select: { name: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { patientId, ...data } = body;

    const report = await prisma.incidentReport.create({
      data: {
        ...data,
        patientId,
        reportedById: session.user.id,
        reportDate: new Date(),
        incidentDate: new Date(data.incidentDate),
        nurseAssessorDate: data.nurseAssessorDate ? new Date(data.nurseAssessorDate) : null,
        reviewedByDate: data.reviewedByDate ? new Date(data.reviewedByDate) : null,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
