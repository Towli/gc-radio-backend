import * as fastify from 'fastify';
import * as cors from 'fastify-cors';
import * as http from 'http';
import * as socketio from 'socket.io';

import * as search from './modules/youtube.api.wrapper';
import * as redis from './modules/redis.wrapper';

import { config } from 'dotenv';

enum ACTIONS {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PLAYLIST_ADD = 'playlist_add',
  PLAYLIST_REMOVE = 'playlist_remove',
  PLAYLIST_FETCH = 'playlist_fetch',
  PLAYBACK_STARTED = 'playback_started',
  PLAYBACK_ENDED = 'playback_started'
}

config();

const PORT = process.env.PORT;

const server = fastify<http.Server>({ logger: true });

const io = socketio.listen(server.server);

io.on('connect', socket => {
  console.log('[client connected] - socket_id: ', socket.id);

  socket.on(ACTIONS.LOGIN, () => {
    redis.set('users', socket.id).catch(error => {
      console.log(error);
    });
  });

  socket.on(ACTIONS.PLAYLIST_ADD, item => {
    console.log(`[${ACTIONS.PLAYLIST_ADD}]: ${item}`);
    redis.List.push('playlist', item);
    // so the idea is to start a timer to run for the duration of
    // the video, pop from playlist from redis at the end of the duration,
    // then start a new timer for the next duration.

    // use an accurate timer (nanotimer?) and begin a playback timer on playback_started
    // tracking/caching each second. client can fetch the current second for syncing up
    // with current playback
  });

  socket.on(ACTIONS.PLAYLIST_REMOVE, item => {
    console.log(`[${ACTIONS.PLAYLIST_REMOVE}]: ${item}`);
    redis.List.pop('playlist');
  });

  socket.on(ACTIONS.PLAYLIST_FETCH, playlist => {
    console.log(`[${ACTIONS.PLAYLIST_ADD}]: ${playlist}`);
    redis.List.getAllFromList(playlist).then(console.log);
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
redis.init();
