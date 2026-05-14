import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    // Use direct (non-pooled) URL for CLI migrations.
    // Vercel Postgres sets POSTGRES_URL_NON_POOLING automatically.
    url: process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL ?? "",
  },
});
