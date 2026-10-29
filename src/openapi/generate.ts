import { mkdirSync, writeFileSync } from "node:fs";
import { buildOpenApiDocument } from "./document.ts";

const out = new URL("../../docs/openapi.json", import.meta.url);

mkdirSync(new URL("./", out), { recursive: true });
writeFileSync(out, JSON.stringify(buildOpenApiDocument(), null, 2) + "\n");

console.log("docs/openapi.json generado.");
