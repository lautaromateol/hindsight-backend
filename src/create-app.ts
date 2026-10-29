import express, { type Express, type Request, type Response, type Router } from 'express';
import { clerkMiddleware, getAuth } from '@clerk/express';
import workspace from "./routes/workspace/route.ts";

// Routers montados; el test de cobertura de OpenAPI recorre esta lista.
export const routerMounts: { path: string; router: Router }[] = [
  { path: '/api/workspace', router: workspace },
];

// Construye la app sin escuchar en un puerto, para poder inspeccionar sus rutas (docs/openapi.json).
export function createApp(): Express {
  const app: Express = express();

  app.use(clerkMiddleware());
  app.use(express.json())

  app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
  });

  app.get('/me', (req: Request, res: Response) => {
    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' } });
      return;
    }

    res.json({ userId });
  });

  for (const { path, router } of routerMounts) {
    app.use(path, router);
  }

  return app;
}
