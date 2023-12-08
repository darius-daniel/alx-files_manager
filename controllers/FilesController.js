import { writeFile, existsSync, mkdir } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    const files = dbClient.db.collection('files');

    if (!userId) {
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
      } else if (type === 'folder') {
        const insertInfo = await files.insertOne({
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          userId,
        });
        files.findOne({ _id: ObjectId(insertInfo.insertedId) })
          .then((file) => {
            if (file) {
              response.status(201).send(file);
            }
          });
      } else {
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!existsSync(folderPath)) {
          mkdir(folderPath, { recursive: true }, (error) => {
            if (error) {
              console.error(`Cannot create directory ${path}`);
            }
          });
        }

        const fileName = uuidv4();
        const filePath = `${folderPath}/${fileName}`;
        writeFile(filePath, atob(data), (error) => {
          if (error) {
            console.error(`Cannot create file ${filePath}`);
          }
        });

        const document = {
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          userId,
        };
        if (type === 'file' || type === 'image') {
          document.localPath = path.resolve(filePath);
        } else {
          document.localPath = folderPath;
        }

        const insertedInfo = await files.insertOne(document);
        files.findOne({ _id: ObjectId(insertedInfo.insertedId) })
          .then((file) => {
            if (file) {
              response.status(201).send(file);
            }
          });
      }
    }
  }

  static async getShow(request, response) {
    const { parentId } = request.params;
    const token = request.header('X-Token');
    const key = `auth-${token}`;
    const files = await dbClient.db.collection('files');

    const userId = await redisClient.get(key);
    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      files.findOne({ parentId })
        .then((file) => {
          if (!file) {
            response.status(404).send({ error: 'Not found' });
          } else {
            response.status(200).send(JSON.stringify(file));
          }
        });
    }
  }

  static async getIndex(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;

    const user = await redisClient.get(key);
    if (!user) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const { page } = request.query;
      const parentId = request.query.parentId || 0;

      const filesCollection = dbClient.db.collection('files');
      const files = await filesCollection.find({ parentId }).toArray();
      if (!files) {
        response.send([]);
      } else {
        const maxPerPage = 20;

        // const pageContents = await filesCollection.aggregate([
        //   { $match: { parentId } },
        //   { $skip: parseInt(page) * maxPerPage },
        //   { $limit: maxPerPage },
        // ]).toArray();
        response.send(JSON.stringify(files.slice(page * maxPerPage, (page + 1) * maxPerPage)));
      }
    }
  }

  static putPublish(request, response) {
    const { id } = request.params;
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = redisClient.get(key);

    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const filesCollection = dbClient.db.collection('files');

      filesCollection.findOne({ userId, _id: ObjectId(id) })
        .then(async (file) => {
          if (!file) {
            response.status(404).send({ error: 'Not found' });
          } else {
            const updateResult = await filesCollection.updateOne(
              { userId },
              { $set: { isPublic: true } },
            );

            response.status(200).send(JSON.stringify(file));
          }
        });
    }
  }

  static putUnpublish(request, response) {
    const { id } = request.params;
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = redisClient.get(key);

    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const filesCollection = dbClient.db.collection('files');

      filesCollection.findOne({ userId, _id: ObjectId(id) })
        .then(async (file) => {
          if (!file) {
            response.status(404).send({ error: 'Not found' });
          } else {
            const updateResult = await filesCollection.updateOne(
              { userId },
              { $set: { isPublic: false } },
            );

            response.status(200).send(JSON.stringify(file));
          }
        });
    }
  }
}

export default FilesController;
