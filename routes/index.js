import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';

function routes(app) {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);

  app.post('/users', UsersController.postNew);
  app.get('/users/me', UsersController.getMe);

  app.get('/connect', AuthController.getConnect);
  app.get('/disconnect', AuthController.getDisconnect);

  app.post('/files', FilesController.postUpload);
  app.get('/files/:id', FilesController.getShow);
  app.get('/files', FilesController.getIndex);
  app.put('/files/:id/publish', FilesController.putPublish);
  app.put('/files/:id/publish', FilesController.putUnpublish);
}

export default routes;
