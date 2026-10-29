import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Las migraciones corren con el dueño de las tablas; la API, con el rol sin privilegios (docs/rls.md).
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
});
