import 'dotenv/config';

import { app } from './app';
import { connectToDatabase } from './config/database';
import { seedDefaultCategories } from './services/categorySeed.service';

async function main() {
  // macOS often uses 5000 for AirPlay/AirTunes; default to 5050 to avoid conflicts.
  const port = Number(process.env.PORT || 5050);
  const mongoUri = process.env.MONGODB_URI || '';

  await connectToDatabase(mongoUri);
  await seedDefaultCategories();

  app.listen(port, () => {
    console.log(`SellIt API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

