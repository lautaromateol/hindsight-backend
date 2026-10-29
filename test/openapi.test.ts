import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildOpenApiDocument } from "../src/openapi/document.ts";
import { listExpressRoutes } from "../src/openapi/express-routes.ts";

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

const documented = (): string[] => {
  const doc = buildOpenApiDocument();
  return Object.entries(doc.paths ?? {})
    .flatMap(([path, item]) =>
      HTTP_METHODS.filter((m) => m in (item as object)).map((m) => `${m.toUpperCase()} ${path}`),
    )
    .sort();
};

test("toda ruta de Express registrada figura en el documento OpenAPI", () => {
  const missing = listExpressRoutes().filter((route) => !documented().includes(route));
  assert.deepEqual(missing, [], `Rutas sin documentar: ${missing.join(", ")}`);
});

test("el documento no describe rutas que Express no registra", () => {
  const registered = listExpressRoutes();
  const extra = documented().filter((route) => !registered.includes(route));
  assert.deepEqual(extra, [], `Rutas documentadas que no existen: ${extra.join(", ")}`);
});

test("docs/openapi.json está al día (corré npm run openapi)", () => {
  const file = JSON.parse(readFileSync(new URL("../docs/openapi.json", import.meta.url), "utf8"));
  assert.deepEqual(file, JSON.parse(JSON.stringify(buildOpenApiDocument())));
});
