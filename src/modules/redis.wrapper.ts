import * as redis from 'redis';

import { config } from 'dotenv';

config();

const REDIS_HOST: string = process.env.WS_PORT;
const REDIS_PORT: number = <number>(<unknown>process.env.WS_PORT); //ts conversion hack

let client: redis.RedisClient;

enum Order {
  Left = 'left',
  Right = 'right'
}

export function init() {
  return new Promise((resolve, reject) => {
    client = redis.createClient(REDIS_PORT, REDIS_HOST);

    client.on('connect', function() {
      console.log('[redis client]: connected');
      resolve();
    });

    client.on('error', function(error) {
      console.log('[ERROR]: ', error);
      reject();
    });
  });
}

export namespace List {
  export function push(list: string, value: string, order?: Order) {
    return new Promise((resolve, reject) => {
      if (order) {
        if (order === Order.Left) {
          client.lpush(list, value, handleResult);
        } else if (order === Order.Right) {
          client.rpush(list, value, handleResult);
        }
      } else {
        client.lpush(list, value, handleResult);
      }
    });
  }

  export function pop(list: string, order?: Order) {
    return new Promise((resolve, reject) => {
      if (order) {
        if (order === Order.Left) {
          client.lpop(list);
        } else if (order === Order.Right) {
          client.rpop(list);
        }
      } else {
        client.lpop(list);
      }
    });
  }

  export function getAllFromList(list: string) {
    return new Promise((resolve, reject) => {
      client.lrange(list, 0, -1, handleResult);
    });
  }
}

export function hset() {
  client.hset('hash key', 'hashtest 1', 'some value', redis.print);
}

export function quit() {
  client.quit();
}

function handleResult(error: Error, response: number | string | string[]) {
  if (error) {
    return Promise.reject(error);
  }

  if (!response) {
    console.log('todo: handle no response case');
  }

  Promise.resolve(response);
}

/**
 * Promisified wrapper for setting a string key/value pair
 */
export function set(key: string, value: string) {
  return new Promise((resolve, reject) => {
    client.set('string key', 'string val', handleResult);
  });
}
