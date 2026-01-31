import 'dotenv/config';

import { app } from './app';
import { connectToDatabase } from './config/database';

async function main() {
  // macOS often uses 5000 for AirPlay/AirTunes; default to 5050 to avoid conflicts.
  const port = Number(process.env.PORT || 5050);
  const mongoUri = process.env.MONGODB_URI || '';

  await connectToDatabase(mongoUri);

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`SellIt API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

