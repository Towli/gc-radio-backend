import * as crypto from 'crypto'

export function hashObject(object: any) {
  return crypto.createHash('sha1').update(object).digest('hex')
}
