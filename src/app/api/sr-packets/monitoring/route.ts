import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { entries, staffSignatures, ...logData } = body;

  const log = await prisma.sRMonitoringLog.create({
    data: {
      ...logData,
      logDate: new Date(logData.logDate),
      staffSignatures: staffSignatures ?? [],
      entries: {
        create: (entries ?? []).map((e: { militaryTime: string; behaviorCode: string; interventionCode: string; staffInitials: string }) => ({
          militaryTime: e.militaryTime,
          behaviorCode: e.behaviorCode,
          interventionCode: e.interventionCode,
          staffInitials: e.staffInitials,
        })),
      },
    },
    include: { entries: true },
  });
  return NextResponse.json(log, { status: 201 });
}
