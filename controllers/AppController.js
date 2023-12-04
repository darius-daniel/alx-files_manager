import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(request, response) {
    response.status(200).send({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(request, response) {
    const nUsers = await dbClient.db.collection('users').countDocuments() || 0;
    const nFiles = await dbClient.db.collection('files').countDocuments() || 0;
    response.status(200).send({ users: nUsers, files: nFiles });
  }
}

module.exports = AppController;
