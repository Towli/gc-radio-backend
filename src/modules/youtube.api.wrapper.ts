import axios from 'axios';

import { config } from 'dotenv';

config();

const YOUTUBE_SEARCH_API_BASE = process.env.YOUTUBE_SEARCH_API_BASE;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface IYoutubeOptions {
  q: string;
  maxResults: number;
  part: string;
  type: string;
  key: string;
}

enum Method {
  Get = 'get',
  Post = 'post',
  Delete = 'delete'
}

export function getYoutubeVideoURL(query: string) {
  const options: IYoutubeOptions = {
    q: query,
    maxResults: 1,
    part: 'snippet',
    type: 'video',
    key: YOUTUBE_API_KEY
  };

  return makeRequest(YOUTUBE_SEARCH_API_BASE, Method.Get, options).then(res => {
    return `https://youtube.com/embed/${res.data.items[0].id.videoId}`;
  });
}

function makeRequest(url: string, method: Method, data: IYoutubeOptions) {
  return axios({
    method: method,
    url: url,
    params: data
  });
}
