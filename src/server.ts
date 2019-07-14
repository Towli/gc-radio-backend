import * as fastify from 'fastify';
import * as cors from 'fastify-cors';
import * as http from 'http';
import * as socketio from 'socket.io';

import * as search from './modules/youtube.api.wrapper';

import { config } from 'dotenv';

config();

const PORT = process.env.PORT;

const server = fastify<http.Server>({ logger: true });

const io = socketio.listen(process.env.PORT);

io.on('connect', socket => {
  console.log('[client connected] - socket_id: ', socket.id);
  socket.on('message', message => {
    console.log('[message received]: ', message);
  });
});

server.register(cors, {
  origin: true
});

server.get('/health-check', {}, (request, reply) => {
  reply.code(200).send({ response: 'OK' });
});

server.get('/search', {}, async (request, reply) => {
  const query = request.query.q;
  try {
    const result = await search.getYoutubeVideoURL(query);
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
