import sha1 from 'sha1';

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class UsersController {
  static async postNew(request, response) {
    const { email } = request.body;
    if (!email) {
      response.status(400).send({'error': 'Missing email'});
    }

    const { password } = request.body;
    if (!password) {
      response.status(400).send({'error': 'Missing password'});
    }

    const user = dbClient.db.collection('users').findOne({ email });
    if (user) {
      response.status(400).send({'error': 'Already exist'});
    }

    const newUser = await dbClient.db.collection('users').insertOne({
      email,
      password: sha1(password),
    });

    response.status(201).send({
      id: newUser.insertedId,
      email,
    });
  }

  static getMe(request, response) {
    const token = request.header('X-Token');
    const user = redisClient.get(`auth_${token}`);
    if (user) {
      console.log(user);
      response.status(200).send({ 'id': user._id, 'email': user.email });
    } else {
      response.status(401).send({ 'error': 'Unauthorized' });
    };
  }
}

module.exports = UsersController;
