import Queue from 'bull';

const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT || 27017;

const url = `mongodb://${host}:${port}`;
const name = 'Generating thumbnails for a file of type image';
const fileQueue = new Queue(name, url);

export default fileQueue;
