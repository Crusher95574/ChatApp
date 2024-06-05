const { Redis } = require("ioredis");
const client = new Redis(
    {
        host: 'caching-f3ff41a-chat-redis.f.aivencloud.com',
        port: 16773,
        username: 'default',
        password: process.env.REDIS_PASSWORD
    }
);

module.exports = client;