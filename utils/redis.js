import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.isConnected = true;
    this.client = createClient()
      .on('error', () => {
        this.isConnected = false;
      });
  }

  isAlive() {
    return this.isConnected;
  }

  async get(key) {
    return await promisify(this.client.get).bind(this.client)(key);
  }

  async set(key, value, duration) {
    await promisify(this.client.set).bind(this.client)(key, value, 'EX', duration);
  }

  async del(key) {
    await promisify(this.client.del).bind(this.client)(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
