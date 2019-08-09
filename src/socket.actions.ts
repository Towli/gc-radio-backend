// HIGH PRIO BUGS:
/**
 * 1. timer needs to work if server restarts etc
 * 2. general playlist weirdness
 * 3. queue weirdness where adding a new item replaces a current
 * 4. (frontend) consecutive duplicate songs don't update playback component
 */

import * as socketio from 'socket.io';

import Timer from './modules/playback.timer';

import * as redis from './modules/redis.wrapper';

enum ACTIONS {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PLAYLIST_ADD = 'playlist_add',
  PLAYLIST_REMOVE = 'playlist_remove',
  PLAYLIST_FETCH = 'playlist_fetch',
  PLAYLIST_CHANGE = 'playlist_change',
  PLAYBACK_STARTED = 'playback_started',
  PLAYBACK_ENDED = 'playback_ended',
  PLAYBACK_FETCH = 'playback_fetch',
  HISTORY_FETCH = 'history_fetch',
  USERS_FETCH = 'users_fetch'
}

enum REDIS_RESOURCES {
  PLAYLIST = 'playlist',
  HISTORY = 'history',
  USERS = 'users'
}

let timer: Timer = null;

// so the idea is to start a timer to run for the duration of
// the video, pop from playlist from redis at the end of the duration,
// then start a new timer for the next duration.

// use an accurate timer (nanotimer?) and begin a playback timer on playback_started
// tracking/caching each second. client can fetch the current second for syncing up
// with current playback

// if there is now just one video in playlist, begin playing
export async function init(server: any) {
  const io = socketio.listen(server.server);

  await redis.init();

  io.on('connect', socket => {
    console.log('[client connected] - socket_id: ', socket.id);

    socket.on(ACTIONS.LOGIN, async () => {
      await redis.List.push('users', socket.id);
      const users = await redis.List.getAllFromList(REDIS_RESOURCES.USERS);
      io.sockets.emit(ACTIONS.USERS_FETCH, users);
    });

    socket.on('disconnect', async () => {
      console.log('[client disconnected] - socket_id: ', socket.id);
      await redis.List.removeByValue('users', socket.id);
      const users = await redis.List.getAllFromList(REDIS_RESOURCES.USERS);
      io.sockets.emit(ACTIONS.USERS_FETCH, users);
    });

    socket.on(ACTIONS.USERS_FETCH, async () => {
      const users = redis.List.getAllFromList(REDIS_RESOURCES.USERS);
      socket.emit(ACTIONS.USERS_FETCH, users);
    });

    socket.on(ACTIONS.PLAYBACK_FETCH, async () => {
      const currentPlayback = JSON.parse(
        (await redis.List.getAllFromList(REDIS_RESOURCES.PLAYLIST))[0]
      );
      const currentTime = timer.currentSecond;

      socket.emit(ACTIONS.PLAYBACK_FETCH, {
        currentPlayback,
        currentTime
      });
    });

    socket.on(ACTIONS.PLAYLIST_ADD, async item => {
      console.log(`[${ACTIONS.PLAYLIST_ADD}]: ${item}`);
      item = JSON.parse(item);
      item.happenedAt = Date.now();
      const currentPlaylistSize: any = await redis.List.push(
        REDIS_RESOURCES.PLAYLIST,
        JSON.stringify(item)
      );

      const currentPlaylist = await redis.List.getAllFromList(
        REDIS_RESOURCES.PLAYLIST
      );
      io.sockets.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist);

      if (currentPlaylistSize < 2) {
        await startPlayback(item);
      }
    });

    socket.on(ACTIONS.PLAYLIST_REMOVE, async index => {
      console.log(`[${ACTIONS.PLAYLIST_REMOVE}]: ${index}`);
      removeItemByIndex(index);
    });

    socket.on(ACTIONS.PLAYLIST_FETCH, async playlist => {
      console.log(`[${ACTIONS.PLAYLIST_FETCH}]: ${JSON.stringify(playlist)}`);
      const currentPlaylist = await redis.List.getAllFromList(
        REDIS_RESOURCES.PLAYLIST
      );
      socket.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist);
    });

    socket.on(ACTIONS.HISTORY_FETCH, async () => {
      console.log(`[${ACTIONS.HISTORY_FETCH}]`);
      const currentHistory = await redis.Set.getAll(REDIS_RESOURCES.HISTORY);
      socket.emit(ACTIONS.HISTORY_FETCH, currentHistory);
    });
  });

  async function removeItemByIndex(index) {
    const itemValue = await redis.List.getValueByIndex(
      REDIS_RESOURCES.PLAYLIST,
      index
    );
    console.log('removing item of value: ', itemValue);
    await redis.List.removeByValue(
      REDIS_RESOURCES.PLAYLIST,
      itemValue as string
    );
    const currentPlaylist = await redis.List.getAllFromList(
      REDIS_RESOURCES.PLAYLIST
    );
    io.sockets.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist);
    if (index < 1) {
      await handlePlaybackEnded();
    }
  }

  async function removeItem() {
    console.log('removeItem()');
    await redis.List.pop(REDIS_RESOURCES.PLAYLIST);
    console.log('popped from list');
    await handlePlaybackEnded();
  }

  async function startPlayback(item) {
    console.log('startPlayback with item: ', item);
    if (!timer) {
      timer = new Timer(item.duration);
    }

    timer.reset();
    timer.duration = item.duration;
    timer.start(() => {
      console.log('timer.start callback..');
      removeItem();
    });

    addToHistory(item);

    io.sockets.emit(ACTIONS.PLAYBACK_STARTED, item);
  }

  async function handlePlaybackEnded() {
    console.log(`[${ACTIONS.PLAYBACK_ENDED}]`);
    const currentPlaylist = await redis.List.getAllFromList(
      REDIS_RESOURCES.PLAYLIST
    );
    io.sockets.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist);
    console.log('currentPlaylist: ', currentPlaylist);
    if (currentPlaylist.length > 0) {
      startPlayback(JSON.parse(currentPlaylist[0]));
    } else {
      console.log('emitting ', ACTIONS.PLAYBACK_ENDED);
      io.sockets.emit(ACTIONS.PLAYBACK_ENDED, null); // playback ended, null means nothing else queued
    }
  }

  function addToHistory(item) {
    if (item.happenedAt) {
      item.happenedAt = undefined;
    }

    return redis.Set.add(
      REDIS_RESOURCES.HISTORY,
      Date.now(),
      JSON.stringify(item)
    );
  }
}
