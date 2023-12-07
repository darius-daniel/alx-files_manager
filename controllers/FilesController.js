import { writeFile, existsSync, mkdir } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');
    const user = await redisClient.get(`auth_${token}`);
    const files = dbClient.db.collection('files');

    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const {
        name, type, data, parentId,
      } = request.body;
      const isPublic = request.body.isPublic || false;

      if (!name) {
        response.status(400).send({ error: 'Missing name' });
      } else if (!type) {
        response.status(400).send({ error: 'Missing type' });
      } else if (!data && type !== 'folder') {
        response.status(400).send({ error: 'Missing name' });
      } else if (parentId) {
        files.findOne({ parentId })
          .then((file) => {
            if (!file) {
              response.status(400).send({ error: 'Parent not found' });
            } else if (file.type.toString() !== 'folder') {
              response.status(400).send({ error: 'Parent is not a folder' });
            }
          });
      } else {
        const document = {
          name,
          type,
          data,
          isPublic,
          parentId: parentId || 0,
          userId: user._id.toString(),
        };

        let file;
        if (type === 'folder') {
          file = await files.insert(document);
        } else {
          const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
          if (!existsSync(folderPath)) {
            mkdir(path, { recursive: true }, (error) => {
              if (error) {
                console.error(`Cannot create directory ${path}`);
              }
            });
          }

          const fileName = uuidv4();
          const filePath = `${path}/${fileName}`;
          writeFile(filePath, atob(data), (error) => {
            if (error) {
              console.error(`Cannot create file ${filePath}`);
            }
          });

          if (type === 'file' || type === 'image') {
            document.localPath = path.resolve(filePath);
          } else {
            document.localPath = folderPath;
          }
          file = await files.insert(document);
        }
        response.status(201).send(file);
      }
    }
  }
}

export default FilesController;
