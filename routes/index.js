import AppController from '../controllers/AppController';

function routes(app) {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
}

module.exports = routes;
