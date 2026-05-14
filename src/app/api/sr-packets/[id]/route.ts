import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const packet = await prisma.sRPacket.findUnique({
    where: { id },
    include: {
      patient: true,
      createdBy: { select: { name: true, title: true } },
      incidentReport: true,
      physicianOrder: true,
      faceToFaceEval: true,
      monitoringLogs: { include: { entries: true } },
      terminationSummary: true,
      patientDebriefing: true,
      staffDebriefing: true,
      afterActionCritique: true,
    },
  });
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(packet);
}
