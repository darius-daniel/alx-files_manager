import {
  readFile, writeFile, existsSync, mkdir,
} from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fileQueue from '../worker';

const mime = require('mime-types');
const imageThumbnail = require('image-thumbnail');

class FilesController {
  static async postUpload(request, response) {
    const token = request.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    const filesCollection = dbClient.db.collection('files');

    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      const {
        name, type, data,
      } = request.body;
      let { parentId } = request.body;
      const isPublic = request.body.isPublic || false;

      if (!name) {
        response.status(400).send({ error: 'Missing name' });
      } else if (!type) {
        response.status(400).send({ error: 'Missing type' });
      } else if (!data && type !== 'folder') {
        response.status(400).send({ error: 'Missing name' });
      } else if (parentId) {
        filesCollection.findOne({ parentId })
          .then((file) => {
            if (!file) {
              response.status(400).send({ error: 'Parent not found' });
            } else if (file.type.toString() !== 'folder') {
              response.status(400).send({ error: 'Parent is not a folder' });
            }
          });
      } else if (type === 'folder') {
        if (parentId) {
          parentId = ObjectId(parentId);
        } else {
          parentId = 0;
        }

        const insertInfo = await filesCollection.insertOne({
          name,
          type,
          isPublic,
          parentId,
          userId: ObjectId(userId),
        });
        filesCollection.findOne({ _id: ObjectId(insertInfo.insertedId) })
          .then((file) => {
            if (file) {
              response.status(201).send(file);
            }
          });
      } else {
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (existsSync(folderPath) === false) {
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

        if (parentId) {
          parentId = ObjectId(parentId);
        } else {
          parentId = 0;
        }

        let insertInfo;
        if (type === 'file' || type === 'image') {
          insertInfo = await filesCollection.insertOne({
            name,
            type,
            isPublic,
            parentId,
            userId: ObjectId(userId),
            localPath: path.resolve(filePath),
          });
        } else if (type === 'folder') {
          insertInfo = await filesCollection.insertOne({
            name,
            type,
            isPublic,
            parentId,
            userId: ObjectId(userId),
            localPath: folderPath,
          });
        }

        filesCollection.findOne({ _id: ObjectId(insertInfo.insertedId) })
          .then((file) => {
            if (file) {
              response.status(201).send(file);
            }
          });

        if (type === 'image') {
          fileQueue.add({ userId, fileId: insertedInfo.insertedId });

          fileQueue.process((job, done) => {
            if (!job.data.filedId) {
              throw new Error('Missing fileId');
            } else if (!job.data.userId) {
              throw new Error('Missing userId');
            } else {
              filesCollection.findeOne({
                _id: ObjectId(job.data.fileId),
                userId: ObjectId(job.data.userId),
              })
                .then((file) => {
                  if (!file) {
                    throw new Error('File not found');
                  } else {
                    const thumbnailWidths = [500, 250, 100];

                    for (const width of thumbnailWidths) {
                      const name = `${document.localPath}_${width}`;

                      imageThumbnail(name, { width, height: width })
                        .then((thumbnail) => {
                          console.log(thumbnail);
                        })
                        .catch((error) => {
                          throw error;
                        });
                    }
                  }
                });
            }
            done();
          });
        }
      }
    }
  }

  static async getShow(request, response) {
    const { id } = request.params;
    const { size } = request.query;
    const token = request.header('X-Token');
    const key = `auth-${token}`;

    const userId = await redisClient.get(key);
    console.log(userId);
    if (!userId) {
      response.status(401).send({ error: 'Unauthorized' });
    } else {
      dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: ObjectId(userId) })
        .then((file) => {
          if (!file) {
            response.status(404).send({ error: 'Not found' });
          } else if (size) {
            const thumbnailName = `${file.localPath}_${size}`;

            if (existsSync(thumbnailName) === true) {
              readFile(thumbnailName, (error, data) => {
                if (!error) {
                  response.send(data);
                }
              });
            } else {
              response.status(404).send({ error: 'Not found' });
            }
          } else {
            response.status(200).send(file);
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
      let { page, parentId } = request.query;
      const filesCollection = dbClient.db.collection('files');

      if (parentId) {
        parentId = ObjectId(parentId);
      } else {
        parentId = 0;
      }

      const files = filesCollection.find({ parentId: ObjectId(parentId) }).toArray();
      if (!files) {
        response.send([]);
      } else {
        const maxPerPage = 20;
        if (!page) {
          page = 0;
        } else {
          page = parseInt(page, 10);
        }

        const pageContents = await filesCollection.aggregate([
          { $match: { parentId } },
          { $skip: page * maxPerPage },
          { $limit: maxPerPage },
        ]).toArray();
        response.send(pageContents);
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

      filesCollection.findOne({ userId: ObjectId(userId), _id: ObjectId(id) })
        .then(async (file) => {
          if (!file) {
            response.status(404).send({ error: 'Not found' });
          } else {
            await filesCollection.updateOne(
              file,
              { $set: { isPublic: true } },
            );

            response.status(200).send(file);
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

      filesCollection.findOne({ userId: ObjectId(userId), _id: ObjectId(id) })
        .then(async (file) => {
          if (!file) {
            response.status(404).send({ error: 'Not found' });
          } else {
            await filesCollection.updateOne(
              file,
              { $set: { isPublic: false } },
            );

            response.status(200).send(file);
          }
        });
    }
  }

  static getFile(request, response) {
    const { id } = request.params;

    dbClient.db.collection('files').findOne({ _id: ObjectId(id) })
      .then(async (file) => {
        if (!file) {
          response.status(404).send({ error: 'Not found' });
        } else {
          const token = request.header('X-Token');
          const key = `auth_${token}`;
          const userId = await redisClient.get(key);

          if (file.isPublic === false || !userId || userId !== file.userId) {
            response.status(404).send({ error: 'Not found' });
          } else if (file.type === 'folder') {
            response.status(400).send({ error: "A folder doesn't have content" });
          } else if (existsSync(file.localPath) === false) {
            response.status(404).send({ error: 'Not found' });
          } else {
            readFile(file.localPath, (error, data) => {
              if (error) {
                response.status(400).send({ error: error.message });
              } else {
                const mimeType = mime.lookup(file.name);
                response.send(data, mimeType);
              }
            });
          }
        }
      });
  }
}

export default FilesController;
