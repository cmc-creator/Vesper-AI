import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const packet = await prisma.sRPacket.findUnique({
    where: { id },
    include: {
      physicianOrder: true,
      faceToFaceEval: true,
      monitoringLogs: { take: 1 },
      terminationSummary: true,
      patientDebriefing: true,
      staffDebriefing: true,
      afterActionCritique: true,
    },
  });

  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the creator, a supervisor, or admin can submit
  const role = (session.user as { role?: string }).role;
  if (packet.createdById !== session.user.id && role !== "ADMIN" && role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (packet.submittedAt) {
    return NextResponse.json({ error: "Packet already submitted" }, { status: 409 });
  }

  // Verify all 7 sections are complete
  const incomplete: string[] = [];
  if (!packet.physicianOrder) incomplete.push("Physician Order");
  if (!packet.faceToFaceEval) incomplete.push("1-Hr Face-to-Face Evaluation");
  if (!packet.monitoringLogs.length) incomplete.push("1:1 Monitoring Log");
  if (!packet.terminationSummary) incomplete.push("Termination of S/R");
  if (!packet.patientDebriefing) incomplete.push("Patient Debriefing");
  if (!packet.staffDebriefing) incomplete.push("Staff Debriefing");
  if (!packet.afterActionCritique) incomplete.push("After Action Critique");

  if (incomplete.length > 0) {
    return NextResponse.json(
      { error: "Cannot submit — incomplete sections: " + incomplete.join(", ") },
      { status: 400 }
    );
  }

  const updated = await prisma.sRPacket.update({
    where: { id },
    data: { submittedAt: new Date() },
  });

  return NextResponse.json(updated);
}
