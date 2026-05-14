import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { renderSRPacketPdf } from "@/lib/pdf/SRPacketPdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const packet = await prisma.sRPacket.findUnique({
    where: { id },
    include: {
      patient: true,
      incidentReport: { select: { id: true, incidentDate: true } },
      createdBy: { select: { name: true, title: true } },
      physicianOrder: true,
      faceToFaceEval: true,
      monitoringLogs: { include: { entries: { select: { id: true } } } },
      terminationSummary: true,
      patientDebriefing: true,
      staffDebriefing: true,
      afterActionCritique: true,
    },
  });

  if (!packet) return notFound();

  const buffer = await renderSRPacketPdf(packet);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sr-packet-${packet.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
