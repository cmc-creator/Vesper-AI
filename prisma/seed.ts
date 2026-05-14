import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  console.log("Seeding database…");

  const adminPassword = await bcrypt.hash("Admin1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@destinysprings.com" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@destinysprings.com",
      password: adminPassword,
      role: Role.ADMIN,
      title: "Admin",
    },
  });

  console.log(`✓ Admin user: ${admin.email}`);

  const staffPassword = await bcrypt.hash("Staff1234!", 12);

  await prisma.user.upsert({
    where: { email: "demo.nurse@destinysprings.com" },
    update: {},
    create: {
      name: "Demo Nurse",
      email: "demo.nurse@destinysprings.com",
      password: staffPassword,
      role: Role.STAFF,
      title: "RN",
      unit: "Koi",
    },
  });

  console.log("✓ Demo nurse: demo.nurse@destinysprings.com (password: Staff1234!)");
  console.log("\nSeed complete.");
  console.log("\nLogin credentials:");
  console.log("  Admin: admin@destinysprings.com / Admin1234!");
  console.log("  Staff: demo.nurse@destinysprings.com / Staff1234!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
