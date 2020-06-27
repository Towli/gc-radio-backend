export enum ACTIONS {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
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
  USERS_FETCH = 'users_fetch',
}

export enum REDIS_RESOURCES {
  PLAYLIST = 'playlist',
  HISTORY = 'history',
  USERS = 'users',
}
