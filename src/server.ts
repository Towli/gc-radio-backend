import * as fastify from 'fastify';
import * as http from 'http';

import { config } from 'dotenv';

config();

const PORT = process.env.PORT;

const server = fastify<http.Server>({ logger: true });

server.get('/health-check', {}, (request, reply) => {
  reply.code(200).send({ response: 'OK' });
});

server.get(
  '/media',
  {},
  (request, reply): any => {
    reply.code(200).send('hello world');
  }
);

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
