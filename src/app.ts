import 'dotenv/config';
import { createApp } from "./create-app.ts";
import { warnIfRlsBypassed } from "./lib/rls-check.ts";

const app = createApp();
const port = 3000;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  void warnIfRlsBypassed();
});
