import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Plain process.env so `prisma generate` still works on Vercel, which has no direct URL.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
