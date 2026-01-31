"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_memory_server_1 = require("mongodb-memory-server");
const database_1 = require("../src/config/database");
describe('database connection', () => {
    it('connects to an in-memory mongodb', async () => {
        const mongod = await mongodb_memory_server_1.MongoMemoryServer.create();
        const uri = mongod.getUri();
        const conn = await (0, database_1.connectToDatabase)(uri);
        expect(conn.readyState).toBe(1);
        await (0, database_1.disconnectFromDatabase)();
        await mongod.stop();
    });
});
