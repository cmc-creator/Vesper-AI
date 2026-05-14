import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST or PATCH physician order for an SR packet
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const order = await prisma.sRPhysicianOrder.upsert({
    where: { srPacketId: body.srPacketId },
    update: body,
    create: { ...body, physicianId: session.user.id },
  });
  return NextResponse.json(order);
}
