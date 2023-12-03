const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static getStatus(request, response) {
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.isAlive();

    response.status(200).send({ redis: redisStatus, db: dbStatus });
  }

  static getStats(request, response) {
    const nbUsers = dbClient.nbUsers();
    const nbFiles = dbClient.nbFiles();

    response.status(200).send({ users: nbUsers, files: nbFiles });
  }
}

module.exports = AppController;
