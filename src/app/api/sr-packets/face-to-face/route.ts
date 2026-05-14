import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const evalRecord = await prisma.sRFaceToFaceEvaluation.upsert({
    where: { srPacketId: body.srPacketId },
    update: { ...body, evalDate: new Date(body.evalDate) },
    create: { ...body, completedById: session.user.id, evalDate: new Date(body.evalDate) },
  });
  return NextResponse.json(evalRecord);
}
