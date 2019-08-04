import * as fastify from 'fastify';
import * as cors from 'fastify-cors';
import * as http from 'http';

import * as search from './modules/youtube.api.wrapper';
import * as sockets from './socket.actions';

import { config } from 'dotenv';

config();

enum QueryType {
  Keyword = 'keyword',
  Id = 'id'
}

const server = fastify<http.Server>({ logger: true });

server.register(cors, {
  origin: true
});

server.get('/health-check', {}, (request, reply) => {
  reply.code(200).send({ response: 'OK' });
});

server.get('/search', {}, async (request, reply) => {
  const query = request.query.q;
  const queryType: QueryType = request.query.type;

  console.log(request.query);

  let result;

  try {
    if (queryType === QueryType.Id) {
      result = await search.getYoutubeVideoById(query);
    } else {
      result = await search.getYoutubeVideoByKeyword(query);
    }

    reply.code(200).send(result);
  } catch (error) {
    console.log(error);
  }
});

const start = async () => {
  try {
    await server.listen(process.env.PORT as any, '0.0.0.0');
    server.log.info(`server listening on ${process.env.PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
sockets.init(server);
