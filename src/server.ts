import * as fastify from 'fastify'
import * as cors from 'fastify-cors'
import * as helmet from 'fastify-helmet'
import * as http from 'http'

import * as search from './modules/youtube.api.wrapper'
import * as sockets from './socket.actions'

import * as hashUtils from './modules/hash.utils'
import * as redis from './modules/redis.wrapper'

import initExitHandler from './modules/graceful.exit'

import { config } from 'dotenv'

config()

enum QueryType {
  Keyword = 'keyword',
  Id = 'id',
}

const server = fastify<http.Server>({ logger: true })

server.register(cors, { origin: true })
server.register(helmet)

server.get('/health-check', {}, (request, reply) => {
  reply.code(200).send({ response: 'OK' })
})

server.get('/search', {}, async (request, reply) => {
  console.log(request.query)

  const query = request.query.q
  const queryType: QueryType = request.query.type

  const hash = hashUtils.hashObject(JSON.stringify({ query, queryType }))

  const cachedResult = await redis.Cache.get(hash)

  if (cachedResult) {
    return reply.code(200).send(JSON.parse(cachedResult))
  }

  let result

  try {
    if (queryType === QueryType.Id) {
      result = await search.getYoutubeVideoById(query)
    } else {
      result = await search.getYoutubeVideoByKeyword(query)
    }

    await redis.Cache.set(hash, JSON.stringify(result))

    reply.code(200).send(JSON.stringify(result))
  } catch (error) {
    console.log(error)
  }
})

const start = async () => {
  try {
    await server.listen(process.env.PORT)
    server.log.info(`server listening on ${process.env.PORT}`)
    initExitHandler(server.server)
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

start()
sockets.init(server)
