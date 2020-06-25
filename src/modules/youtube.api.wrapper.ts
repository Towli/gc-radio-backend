import axios from 'axios'

import { config } from 'dotenv'

config()

const YOUTUBE_API_BASE = process.env.YOUTUBE_API_BASE
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

interface IYoutubeSearchOptions {
  q: string
  maxResults: number
  part: string
  type: string
  key: string
}

interface IYoutubeVideoOptions {
  id: string
  part: string
  maxResults?: number
  type?: string
  key?: string
}

enum Method {
  Get = 'get',
  Post = 'post',
  Delete = 'delete',
}

enum YoutubeAPIEndpoint {
  Search = 'search',
  Videos = 'videos',
}

export function getYoutubeVideoByKeyword(query: string) {
  return getSnippet(query).then((result) => {
    return getDuration(result.id.videoId).then((duration) => {
      return {
        title: result.snippet.title,
        embedUrl: `https://youtube.com/embed/${result.id.videoId}`,
        thumbnail: result.snippet.thumbnails.medium,
        duration: duration,
      }
    })
  })
}

export function getYoutubeVideoById(id: string) {
  return getSnippetById(id).then((result) => {
    return getDuration(id).then((duration) => {
      return {
        title: result.snippet.title,
        embedUrl: `https://youtube.com/embed/${id}`,
        thumbnail: result.snippet.thumbnails.medium,
        duration: duration,
      }
    })
  })
}

/**
 * Time returned from youtube video api is formatted as an ISO 8601 string
 * @param videoId
 */
function getDuration(videoId: string): Promise<number | null> {
  const options: IYoutubeVideoOptions = {
    id: videoId,
    part: 'contentDetails',
    key: YOUTUBE_API_KEY,
  }
  return makeRequest(`${YOUTUBE_API_BASE}/${YoutubeAPIEndpoint.Videos}`, Method.Get, options).then((res) => {
    const duration = res.data.items[0] ? res.data.items[0].contentDetails.duration : null
    return convertISO8601DurationToMs(duration)
  })
}

function getSnippet(query: string): Promise<any> {
  const options: IYoutubeSearchOptions = {
    q: query,
    maxResults: 1,
    part: 'snippet',
    type: 'video',
    key: YOUTUBE_API_KEY,
  }

  return makeRequest(`${YOUTUBE_API_BASE}/${YoutubeAPIEndpoint.Search}`, Method.Get, options).then((res) => {
    return res.data.items[0] || null
  })
}

function getSnippetById(videoId: string): Promise<any> {
  const options: IYoutubeVideoOptions = {
    id: videoId,
    maxResults: 1,
    part: 'snippet',
    type: 'video',
    key: YOUTUBE_API_KEY,
  }

  return makeRequest(`${YOUTUBE_API_BASE}/${YoutubeAPIEndpoint.Videos}`, Method.Get, options).then((res) => {
    return res.data.items[0] || null
  })
}

function makeRequest(url: string, method: Method, data: IYoutubeSearchOptions | IYoutubeVideoOptions) {
  return axios({
    method: method,
    url: url,
    params: data,
  })
}

/**
 * TODO: turn this into a human friendly TS function
 * @param duration
 */
function convertISO8601DurationToMs(duration: any): number | null {
  let a = duration.match(/\d+/g)

  if (duration.indexOf('M') >= 0 && duration.indexOf('H') == -1 && duration.indexOf('S') == -1) {
    a = [0, a[0], 0]
  }

  if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1) {
    a = [a[0], 0, a[1]]
  }
  if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1 && duration.indexOf('S') == -1) {
    a = [a[0], 0, 0]
  }

  duration = 0

  if (a.length == 3) {
    duration = duration + parseInt(a[0]) * 3600
    duration = duration + parseInt(a[1]) * 60
    duration = duration + parseInt(a[2])
  }

  if (a.length == 2) {
    duration = duration + parseInt(a[0]) * 60
    duration = duration + parseInt(a[1])
  }

  if (a.length == 1) {
    duration = duration + parseInt(a[0])
  }
  return duration * 1000
}
