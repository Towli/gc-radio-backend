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
  PLAYBACK_FETCH = 'playback_fetch'
}

// update type, currently just wrong
interface IPlaylistItem {
  url: string;
  duration: number;
  happened_at: number;
}

let timer: Timer;

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

    socket.on(ACTIONS.LOGIN, () => {
      redis.set('users', socket.id).catch(error => {
        console.log(error);
      });
    });

    socket.on(ACTIONS.PLAYBACK_FETCH, async () => {
      const currentPlayback = JSON.parse(
        (await redis.List.getAllFromList('playlist'))[0]
      );
      const currentTime = timer.currentSecond;

      socket.emit(ACTIONS.PLAYBACK_FETCH, {
        currentPlayback,
        currentTime
      });
    });

    socket.on(ACTIONS.PLAYLIST_ADD, async (item: IPlaylistItem) => {
      console.log(`[${ACTIONS.PLAYLIST_ADD}]: ${item}`);
      const value = { ...item, happenedAt: Date.now() };
      console.log(value);
      const currentPlaylistSize: any = await redis.List.push(
        'playlist',
        JSON.stringify(value)
      );

      const currentPlaylist = await redis.List.getAllFromList('playlist');
      socket.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist);

      if (currentPlaylistSize < 2) {
        await startPlayback(socket, item);
      }
    });

    socket.on(ACTIONS.PLAYLIST_REMOVE, async index => {
      console.log(`[${ACTIONS.PLAYLIST_REMOVE}]: ${index}`);
      const itemValue = await redis.List.getValueByIndex('playlist', index);
      console.log(`[${ACTIONS.PLAYLIST_REMOVE}]: ${itemValue}`);
      await redis.List.removeByValue('playlist', itemValue as string);
      const currentPlaylist = await redis.List.getAllFromList('playlist');
      socket.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist);
    });

    socket.on(ACTIONS.PLAYLIST_FETCH, async playlist => {
      console.log(`[${ACTIONS.PLAYLIST_FETCH}]: ${JSON.stringify(playlist)}`);
      const currentPlaylist = await redis.List.getAllFromList('playlist');
      socket.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist);
    });
  });

  async function removeItem(socket) {
    await redis.List.pop('playlist');
    await handlePlaybackEnded(socket);
  }

  async function startPlayback(socket, item) {
    timer = new Timer(item.duration);
    timer.start(async () => {
      await removeItem(socket);
    });
    io.sockets.emit(ACTIONS.PLAYBACK_STARTED, item);
  }

  async function handlePlaybackEnded(socket) {
    console.log(`[${ACTIONS.PLAYBACK_ENDED}]`);
    const currentPlaylist = await redis.List.getAllFromList('playlist');
    console.log('currentPlaylist: ', currentPlaylist);
    if (currentPlaylist.length > 0) {
      startPlayback(socket, JSON.parse(currentPlaylist[0]));
    }
  }
}
