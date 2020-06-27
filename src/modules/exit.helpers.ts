import * as redis from './redis.wrapper'

import { REDIS_RESOURCES } from '../types/socket'

export async function flushConnections() {
  try {
    await redis.List.deleteAllFromList(REDIS_RESOURCES.USERS)
  } catch (error) {
    console.log('Failed to flush connections: ', error)
  }
}
