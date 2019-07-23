import * as fastify from 'fastify';
import * as cors from 'fastify-cors';
import * as http from 'http';

import * as search from './modules/youtube.api.wrapper';
import * as sockets from './socket.actions';

import { config } from 'dotenv';

config();

const PORT = process.env.PORT;

const server = fastify<http.Server>({ logger: true });

server.register(cors, {
  origin: true
});

server.get('/health-check', {}, (request, reply) => {
  reply.code(200).send({ response: 'OK' });
});

server.get('/search', {}, async (request, reply) => {
  const query = request.query.q;
  try {
    const result = await search.getYoutubeVideo(query);
    reply.code(200).send(result);
  } catch (error) {
    console.log(error);
  }
});

const start = async () => {
  try {
    await server.listen(PORT);
    server.log.info(`server listening on ${PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start();
sockets.init(server);
