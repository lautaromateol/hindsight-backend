import { createApp, routerMounts } from "../create-app.ts";

type Layer = {
  name: string;
  route?: { path: string; methods: Record<string, boolean> };
  matchers: ((path: string) => unknown)[];
};

type Stack = Layer[];

// Una app de Express guarda el stack en .router; un Router, directo en .stack.
const stackOf = (target: unknown): Stack => {
  const t = target as { router?: { stack: Stack }; stack?: Stack };
  return (t.router?.stack ?? t.stack)!;
};

// Express no expone el router de una sub-app montada, así que los montajes se resuelven con routerMounts.
function collect(stack: Stack, prefix: string, routes: Set<string>) {
  for (const layer of stack) {
    if (!layer.route) continue;
    const path = (prefix + (layer.route.path === "/" ? "" : layer.route.path)) || "/";
    for (const method of Object.keys(layer.route.methods)) {
      routes.add(`${method.toUpperCase()} ${path.replace(/:(\w+)/g, "{$1}")}`);
    }
  }
}

// Devuelve las rutas registradas como "GET /api/workspace/{id}".
export function listExpressRoutes(): string[] {
  const routes = new Set<string>();
  const app = createApp();

  collect(stackOf(app), "", routes);

  for (const layer of stackOf(app)) {
    if (layer.name !== "mounted_app" && layer.name !== "router") continue;

    // El matcher de una capa acepta cualquier ruta que empiece con su prefijo: si dos montajes coinciden
    // (/api/workspace y /api/workspace/:workspaceId/member), el de la capa es el más corto.
    const mount = routerMounts
      .filter(({ path }) => layer.matchers.some((match) => match(path)))
      .sort((a, b) => a.path.length - b.path.length)[0];
    if (!mount) {
      throw new Error("Hay un router montado que no está en routerMounts (src/create-app.ts).");
    }
    collect(stackOf(mount.router), mount.path, routes);
  }

  return [...routes].sort();
}
