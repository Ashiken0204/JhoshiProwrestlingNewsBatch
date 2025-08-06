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
      newsItems: '.blog_list > div',
      title: 'h3 a span',
      summary: '.detail',
      thumbnail: '.blog_photo img',
      publishedAt: '.blog_date',
      detailUrl: 'h3 a'
    }
  },
  {
    name: 'chocopro',
    displayName: 'チョコプロ',
    baseUrl: 'https://chocoprowrestling.com',
    newsListUrl: 'https://chocoprowrestling.com/',
    selectors: {
      newsItems: 'article, .post, .news-item, li',
      title: 'a, h1, h2, h3, .title',
      summary: '.excerpt, .summary, .content',
      thumbnail: 'img',
      publishedAt: '.date, time, .published',
      detailUrl: 'a'
    }
  },
  {
    name: 'sendaigirls',
    displayName: '仙女',
    baseUrl: 'https://sendaigirls.jp',
    newsListUrl: 'https://sendaigirls.jp/news/',
    selectors: {
      newsItems: 'li',
      title: 'h3 a',
      summary: 'p',
      thumbnail: 'img',
      publishedAt: 'li',
      detailUrl: 'h3 a'
    }
  },
  {
    name: 'diana',
    displayName: 'ディアナ',
    baseUrl: 'https://www-diana.com',
    newsListUrl: 'https://www-diana.com/news/',
    selectors: {
      newsItems: '[id^="rt-tpg-container-"] .rt-detail',
      title: '.entry-title a',
      summary: '.entry-content',
      thumbnail: '.rt-img-holder img',
      publishedAt: '.entry-date',
      detailUrl: '.entry-title a'
    }
  }
];