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

  // CORS: el front corre en otro origen (puerto). Orígenes separados por coma en CORS_ORIGINS.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(',').map((o) => o.trim());
  app.use((req: Request, res: Response, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

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
