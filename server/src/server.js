import { env } from './config/env.js';
import { connectDB } from './config/database.js';
import app from './app.js';

await connectDB();

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
