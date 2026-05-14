import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { renderIncidentPdf } from "@/lib/pdf/IncidentPdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const ir = await prisma.incidentReport.findUnique({
    where: { id },
    include: {
      patient: true,
      reportedBy: { select: { name: true, title: true } },
    },
  });

  if (!ir) return notFound();

  const categories = (ir.categories as string[]) ?? [];
  const witnesses = (ir.witnesses as { name: string; isStaff: boolean; contactOrOther: string }[]) ?? [];
  const notifications = (ir.notifications as { party: string; name: string; contactMethod: string; date: string; time: string }[]) ?? [];

  const buffer = await renderIncidentPdf({
      id: ir.id,
      reportDate: ir.reportDate,
      reporterName: ir.reporterName,
      reportedBy: ir.reportedBy,
      patient: {
        fullName: ir.patient.fullName,
        dob: ir.patient.dob,
        mrn: ir.patient.mrn,
      },
      incidentDate: ir.incidentDate,
      incidentTime: ir.incidentTime,
      unit: ir.unit,
      location: ir.location,
      locationOther: ir.locationOther,
      categories,
      summaryOfEvent: ir.summaryOfEvent,
      witnesses,
      nursingAssessmentNA: ir.nursingAssessmentNA ?? false,
      nursingAssessment: ir.nursingAssessment,
      painScale: ir.painScale,
      patientDeniesPain: ir.patientDeniesPain ?? false,
      notifications,
      incidentLevel: ir.incidentLevel,
      reviewedByName: ir.reviewedByName,
      qmReviewInitials: ir.qmReviewInitials,
      qmComments: ir.qmComments,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="incident-${ir.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
