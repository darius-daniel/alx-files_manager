import { v4 as uuidv4 } from 'uuid';
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AuthController {
  static getConnect(request, response) {
    const auth = request.header('Authorization');
    const hashedPwd = auth.toString().split(' ')[1];
    const user = dbClient.db.collection('users').findOne({'password': hashedPwd});
    if (!user) {
      response.status(401).send({'error': 'Unauthorized'});
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    redisClient.set(key, user, 86400);

    response.status(200).send({'token': token});
  }

  static getDisconnect(request, response) {
    const token = request.header('X-Token');
    const user = redisClient.get(`auth_${token}`);
    if (user) {
      redisClient.del(`auth_${token}`);
      response.status(204).send();
    } else {
      response.status(401).send({'error': 'Unauthorized'});
    }
  }
}

export default AuthController;
module.exports = AuthController;
