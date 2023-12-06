import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const pwd = request.header('Authorization').split(' ')[1];
    const users = dbClient.db.collection('user');

    users.findOne({ password: sha1(pwd) })
      .then(async (user) => {
        if (!user) {
          response.status(401).send({ error: 'Unauthorized' });
        } else {
          const token = uuidv4();
          const key = `auth_${token}`;

          await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
          response.status(200).send({ token });
        }
      });
  }

  static async getDisconnect(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const users = dbClient.db.collection('users');

    users.findOne({ _id: await redisClient.get(key) })
      .then(async (user) => {
        if (!user) {
          response.status(401).send({ error: 'Unauthorized' });
        } else {
          await redisClient.del(key);
          response.status(204).send();
        }
      });
  }
}

module.exports = AuthController;
