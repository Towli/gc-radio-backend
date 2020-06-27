/**
 * todo ~
 * 1. make timer work on server restart
 * 2. thoroughly test durations (hour+ durations fail i think)
 */

import * as socketio from 'socket.io'

import Timer from './modules/playback.timer'

import * as redis from './modules/redis.wrapper'
import { ACTIONS, REDIS_RESOURCES } from './types/socket'

let timer: Timer = null

// so the idea is to start a timer to run for the duration of
// the video, pop from playlist from redis at the end of the duration,
// then start a new timer for the next duration.

// use an accurate timer (nanotimer?) and begin a playback timer on playback_started
// tracking/caching each second. client can fetch the current second for syncing up
// with current playback

// if there is now just one video in playlist, begin playing
export async function init(server: any) {
  const io = socketio.listen(server.server)

  await redis.init()

  io.on(ACTIONS.CONNECT, (socket) => {
    console.log(`[${ACTIONS.CONNECT}]: socket_id - ${socket.id}`)

    socket.on(ACTIONS.DISCONNECT, async () => {
      try {
        console.log(`[${ACTIONS.DISCONNECT}]: socket_id - ${socket.id}`)
        await redis.List.removeByValue('users', socket.id)
        const users = await redis.List.getAllFromList(REDIS_RESOURCES.USERS)
        io.sockets.emit(ACTIONS.USERS_FETCH, users)
      } catch (error) {
        console.log(error)
      }
    })

    socket.on(ACTIONS.PLAYBACK_FETCH, async () => {
      try {
        console.log(`[${ACTIONS.PLAYBACK_FETCH}]`)

        const playlist = await redis.List.getAllFromList(REDIS_RESOURCES.PLAYLIST)
        const currentPlayback = playlist.length > 0 && JSON.parse(playlist[0])
        const currentTime = timer.currentSecond

        socket.emit(ACTIONS.PLAYBACK_FETCH, {
          currentPlayback,
          currentTime,
        })
      } catch (error) {
        console.log(error)
      }
    })

    socket.on(ACTIONS.PLAYLIST_ADD, async (item) => {
      try {
        console.log(`[${ACTIONS.PLAYLIST_ADD}]: ${item}`)

        item = JSON.parse(item)
        item.happenedAt = Date.now()

        const currentPlaylistSize: number = await redis.List.push(REDIS_RESOURCES.PLAYLIST, JSON.stringify(item))
        const currentPlaylist = await redis.List.getAllFromList(REDIS_RESOURCES.PLAYLIST)

        io.sockets.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist)

        if (currentPlaylistSize < 2) {
          await startPlayback(item)
        }
      } catch (error) {
        console.log(error)
      }
    })

    socket.on(ACTIONS.PLAYLIST_REMOVE, async (index) => {
      console.log(`[${ACTIONS.PLAYLIST_REMOVE}]: ${index}`)
      removeItemByIndex(index)
    })

    socket.on(ACTIONS.PLAYLIST_FETCH, async () => {
      console.log(`[${ACTIONS.PLAYLIST_FETCH}]`)
      const currentPlaylist = await redis.List.getAllFromList(REDIS_RESOURCES.PLAYLIST)
      socket.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist)
    })

    socket.on(ACTIONS.HISTORY_FETCH, async () => {
      console.log(`[${ACTIONS.HISTORY_FETCH}]`)
      const currentHistory = await redis.Set.getAll(REDIS_RESOURCES.HISTORY)
      socket.emit(ACTIONS.HISTORY_FETCH, currentHistory)
    })

    socket.on(ACTIONS.USERS_FETCH, async () => {
      console.log(`[${ACTIONS.USERS_FETCH}]`)
      const users = redis.List.getAllFromList(REDIS_RESOURCES.USERS)
      socket.emit(ACTIONS.USERS_FETCH, users)
    })

    socket.on(ACTIONS.LOGIN, async () => {
      console.log(`[${ACTIONS.LOGIN}]`)
      await redis.List.push('users', socket.id)
      const users = await redis.List.getAllFromList(REDIS_RESOURCES.USERS)
      io.sockets.emit(ACTIONS.USERS_FETCH, users)
    })
  })

  async function removeItemByIndex(index) {
    const itemValue = await redis.List.getValueByIndex(REDIS_RESOURCES.PLAYLIST, index)
    await redis.List.removeByValue(REDIS_RESOURCES.PLAYLIST, itemValue as string)

    const currentPlaylist = await redis.List.getAllFromList(REDIS_RESOURCES.PLAYLIST)
    io.sockets.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist)

    if (index < 1) {
      await handlePlaybackEnded()
    }
  }

  async function removeItem() {
    await redis.List.pop(REDIS_RESOURCES.PLAYLIST)
    await handlePlaybackEnded()
  }

  async function startPlayback(item) {
    console.log('starting with item: ', item)

    if (!timer) {
      timer = new Timer(item.duration)
    }

    timer.reset()
    timer.duration = item.duration
    timer.start(() => {
      console.log('timer.start callback..')
      removeItem()
    })

    addToHistory(item)

    item.happenedAt = Date.now()

    io.sockets.emit(ACTIONS.PLAYBACK_STARTED, item)
  }

  async function handlePlaybackEnded() {
    const currentPlaylist = await redis.List.getAllFromList(REDIS_RESOURCES.PLAYLIST)
    io.sockets.emit(ACTIONS.PLAYLIST_FETCH, currentPlaylist)

    if (currentPlaylist.length > 0) {
      startPlayback(JSON.parse(currentPlaylist[0]))
    } else {
      io.sockets.emit(ACTIONS.PLAYBACK_ENDED, null) // playback ended, null means nothing else queued
    }
  }

  function addToHistory(item) {
    item.happenedAt && delete item.happenedAt
    return redis.Set.add(REDIS_RESOURCES.HISTORY, Date.now(), JSON.stringify(item))
  }
}
