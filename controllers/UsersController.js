const sha1 = require('sha1');
const dbClient = require('../utils/db');

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

  // static getMe(request, response) {

  // }
}

// export default UsersController;
module.exports = UsersController;
