import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" } });
  return NextResponse.json(patients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fullName, dob, mrn } = await req.json();
  if (!fullName || !dob || !mrn) {
    return NextResponse.json({ error: "fullName, dob, and mrn are required" }, { status: 400 });
  }
  const existing = await prisma.patient.findUnique({ where: { mrn } });
  if (existing) return NextResponse.json(existing);
  const patient = await prisma.patient.create({
    data: { fullName, dob: new Date(dob), mrn },
  });
  return NextResponse.json(patient, { status: 201 });
}
