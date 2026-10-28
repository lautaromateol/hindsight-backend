import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import { clerkMiddleware, getAuth } from '@clerk/express';
import workspace from "./routes/workspace/route.ts";

const app: Express = express();
const port = 3000;

app.use(clerkMiddleware());
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.get('/me', (req: Request, res: Response) => {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({ userId });
});

app.use('/api/workspace', workspace)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
