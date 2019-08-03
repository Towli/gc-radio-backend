import * as redis from 'redis';

import { config } from 'dotenv';

config();

const REDIS_URL: string = process.env.REDIS_URL;

let client: redis.RedisClient;

enum Order {
  Left = 'left',
  Right = 'right'
}

export function init() {
  return new Promise((resolve, reject) => {
    client = redis.createClient(REDIS_URL);

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
  // type this...
  export function push(
    list: string,
    value: string,
    order?: Order
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (order) {
        if (order === Order.Left) {
          client.lpush(list, value, (error, response) => {
            handleResult(error, response, resolve, reject);
          });
        } else if (order === Order.Right) {
          client.rpush(list, value, (error, response) => {
            handleResult(error, response, resolve, reject);
          });
        }
      } else {
        client.rpush(list, value, (error, response) => {
          handleResult(error, response, resolve, reject);
        });
      }
    });
  }

  export function getValueByIndex(list: string, index: number) {
    return new Promise((resolve, reject) => {
      client.lindex(list, index, (error, response) => {
        handleResult(error, response, resolve, reject);
      });
    });
  }

  export function removeByValue(list: string, value: string) {
    return new Promise((resolve, reject) => {
      client.lrem(list, 1, value, (error, response) => {
        handleResult(error, response, resolve, reject);
      });
    });
  }

  export function pop(list: string, order?: Order) {
    return new Promise((resolve, reject) => {
      if (order) {
        if (order === Order.Left) {
          client.lpop(list, (error, response) => {
            handleResult(error, response, resolve, reject);
          });
        } else if (order === Order.Right) {
          client.rpop(list, (error, response) => {
            handleResult(error, response, resolve, reject);
          });
        }
      } else {
        client.lpop(list, (error, response) => {
          handleResult(error, response, resolve, reject);
        });
      }
    });
  }

  export function getAllFromList(list: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      client.lrange(list, 0, -1, (error, response) => {
        handleResult(error, response, resolve, reject);
      });
    });
  }
}

export function quit() {
  client.quit();
}

/**
 * Promisified wrapper for setting a string key/value pair
 */
export function set(key: string, value: string) {
  return new Promise((resolve, reject) => {
    client.set('string key', 'string val', (error, response) => {
      handleResult(error, response, resolve, reject);
    });
  });
}

function handleResult(
  error: Error,
  response: number | string | string[],
  resolve,
  reject
) {
  if (error) {
    return reject(error);
  }

  if (!response) {
    console.log('todo: handle no response case');
  }

  resolve(response);
}
