import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  connectToDatabase,
  disconnectFromDatabase
} from '../src/config/database';

describe('database connection', () => {
  it('connects to an in-memory mongodb', async () => {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const conn = await connectToDatabase(uri);
    expect(conn.readyState).toBe(1);

    await disconnectFromDatabase();
    await mongod.stop();
  });
});

