import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || 27017;
    const dbName = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}/`;
    this.client = new MongoClient(url);
    this.isConnected = false;
    this.main()
      .then(() => {
        this.isConnected = true;
      })
      .catch();

    this.db = this.client.db(dbName);
  }

  async main() {
    await this.client.connect();
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments({});
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments({});
  }
}

const dbClient = new DBClient();
export default dbClient;
module.exports = dbClient;
