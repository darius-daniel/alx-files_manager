import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || 27017;
    const dbName = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.isConnected = false;
    this.client = new MongoClient(url, { useUnifiedTopology: true });

    this.main()
      .then(() => {
        this.isConnected = true;
      });

    this.db = this.client.db(dbName);
  }

  async main() {
    // Use connect method to connect to the server
    await this.client.connect(() => null);
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    const nUsers = await this.db.collection('users').countDocuments() || 0;
    return nUsers;
  }

  async nbFiles() {
    const nFiles = await this.db.collection('files').countDocuments() || 0;
    return nFiles;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
