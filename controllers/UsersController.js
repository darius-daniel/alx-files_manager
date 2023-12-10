import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;

    if (!email) {
      response.status(400).send({ error: 'Missing email' });
    } else if (!password) {
      response.status(400).send({ error: 'Missing password' });
    } else if (await dbClient.db.collection('users').findOne({ email, password: sha1(password) })) {
      response.status(400).send({ error: 'Already exist' });
    } else {
      const newUser = await dbClient.db.collection('users').insertOne({
        email,
        password: sha1(password)
      });
      response.status(201).send({ id: newUser.insertedId.toString(), email });
    }
  }

  static async getMe(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      dbClient.db.collection('users').findOne({ _id: ObjectId(userId) })
        .then((user) => {
          if (!user) {
            response.status(401).send({ error: 'Unauthorized' });
          } else {
            response.status(200).send({ email: user.email, id: userId.toString() });
          }
        });
    }
  }
}

export default UsersController;
