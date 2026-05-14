import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const packets = await prisma.sRPacket.findMany({
    include: {
      patient: true,
      createdBy: { select: { name: true } },
      physicianOrder: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(packets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const packet = await prisma.sRPacket.create({
    data: {
      patientId: body.patientId,
      createdById: session.user.id,
      incidentReportId: body.incidentReportId ?? null,
    },
  });
  return NextResponse.json(packet, { status: 201 });
}
