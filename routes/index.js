const AppController = require('../controllers/AppController');
const AuthController = require('../controllers/AuthController');
const UsersController = require('../controllers/UsersController');

function route(app) {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
  app.post('/users', UsersController.postNew);
  // app.get('/users/me', UsersController.getMe);
  // app.get('/connect', AuthController.getConnect);
  // app.get('/disconnect', AuthController.getDisconnect);
}

module.exports = route;
