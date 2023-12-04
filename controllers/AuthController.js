import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static getConnect(request, response) {
    const password = request.header('Authorization').split(' ')[1];
    const users = dbClient.db.collection('user');
    const user = users.findOne({ password: sha1(password) });

    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const token = uuidv4();
      const key = `auth_${token}`;

      redisClient.set(key, user, (60 * 60 * 24) * 1000);
      response.status(200).send({ token });
    }
  }

  static getDisconnect(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const users = dbClient.db.collection('users');
    const user = redisClient.get(key);

    if (!users.findOne(user)) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      redisClient.del(key);
      response.status(204).send();
    }
  }
}

module.exports = AuthController;