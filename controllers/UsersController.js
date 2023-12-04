import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static postNew(request, response) {
    const { email, password } = request.body;
    const users = dbClient.db.collection('users');

    if (!email) {
      response.status(400).send({ error: 'Missing email' });
    } else if (!password) {
      response.status(400).send({ error: 'Missing password' });
    } else if (users.findOne({ email })) {
      response.status(400).send({ error: 'Already exist' });
    } else {
      const newUser = users.insertOne({ email, password: sha1(password) });
      response.status(201).send({ id: newUser.InsertId, email });
    }
  }

  static getMe(request, response) {
    const token = request.headers['X-Token'];
  }
}

module.exports = UsersController;
