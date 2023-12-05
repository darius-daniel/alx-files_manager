import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;
    const users = dbClient.db.collection('users');

    if (!email) {
      response.status(400).send({ error: 'Missing email' });
    } else if (!password) {
      response.status(400).send({ error: 'Missing password' });
    } else if (await (await users.findOne({ email }))) {
      response.status(400).send({ error: 'Already exist' });
    } else {
      const newUser = await (await users.insertOne({ email, password: sha1(password) }));
      response.status(201).send({ id: newUser.insertedId, email });
    }
  }

  static async getMe(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const users = dbClient.db.collection('users');
    const usr = await (await redisClient.get(key));

    if (!usr) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const user = await (await users.findOne({ usr }));
      response.status(200).send({
        email: user.email,
        id: user._id,
      });
    }
  }
}

module.exports = UsersController;
