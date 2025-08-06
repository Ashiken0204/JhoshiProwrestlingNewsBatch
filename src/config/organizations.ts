import { NewsOrganization } from '../types/news';

// 女子プロレス団体の設定（実際のサイト構造に基づく）
export const ORGANIZATIONS: NewsOrganization[] = [
  {
    name: 'stardom',
    displayName: 'スターダム',
    baseUrl: 'https://wwr-stardom.com',
    newsListUrl: 'https://wwr-stardom.com/news/',
    selectors: {
      newsItems: 'ul li', // ニュース一覧のリスト項目
      title: 'a', // リンクテキストがタイトル
      summary: '', // 概要は別途取得が必要
      thumbnail: 'img', // サムネイル画像
      publishedAt: 'li', // 日付は同じli要素内
      detailUrl: 'a'
    }
  },
  {
    name: 'tjpw',
    displayName: '東京女子プロレス',
    baseUrl: 'https://www.tjpw.jp',
    newsListUrl: 'https://www.tjpw.jp/news',
    selectors: {
      newsItems: 'article, .news-item, li', // ニュース項目
      title: 'a, h3, .title', // タイトル要素
      summary: '.summary, .excerpt', // 概要
      thumbnail: 'img', // サムネイル
      publishedAt: '.date, time', // 日付
      detailUrl: 'a'
    }
  },
  {
    name: 'ice_ribbon',
    displayName: 'アイスリボン',  
    baseUrl: 'https://iceribbon.com',
    newsListUrl: 'https://iceribbon.com/news_list.php',
    selectors: {
      newsItems: 'tr, .news-item, li',
      title: 'a, .title, td',
      summary: '.summary, .content',
      thumbnail: 'img',
      publishedAt: '.date, time, td:first-child',
      detailUrl: 'a'
    }
  },
  {
    name: 'wave',
    displayName: 'プロレスリングWAVE',
    baseUrl: 'https://pro-w-wave.com',
    newsListUrl: 'https://pro-w-wave.com/',
    selectors: {
      newsItems: '.news-item, article, li',
      title: 'a, h3, .title',
      summary: '.summary, .excerpt',
      thumbnail: 'img',
      publishedAt: '.date, time',
      detailUrl: 'a'
    }
  }
];