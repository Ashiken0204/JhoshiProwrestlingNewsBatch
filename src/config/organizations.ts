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
      publishedAt: '.date-meta',
      detailUrl: '.entry-title a'
    }
  },
  {
    name: 'oz_academy',
    displayName: 'OZアカデミー',
    baseUrl: 'https://oz-academy.com',
    newsListUrl: 'https://oz-academy.com/all',
    selectors: {
      newsItems: 'article.p-news__post',
      title: '.p-news__post--title',
      summary: '.p-news__post--text',
      thumbnail: '.p-news__post--image img',
      publishedAt: '.p-news__post--date',
      detailUrl: 'a.p-news__post--link'
    }
  },
  {
    name: 'seadlinnng',
    displayName: 'SEAdLINNNG',
    baseUrl: 'https://seadlinnng.com',
    newsListUrl: 'https://seadlinnng.com/news',
    useSelenium: true, // Seleniumを使用して動的コンテンツを取得
    selectors: {
      newsItems: 'article.item-acvinfo',
      title: 'article.item-acvinfo',
      summary: 'article.item-acvinfo',
      thumbnail: 'img',
      publishedAt: 'article.item-acvinfo',
      detailUrl: 'article.item-acvinfo'
    }
  },
  {
    name: 'marigold',
    displayName: 'マリーゴールド',
    baseUrl: 'https://dsf-marigold.com',
    newsListUrl: 'https://dsf-marigold.com/blogs/',
    selectors: {
      newsItems: '.c-post1.c-post1--diff',
      title: '.c-post1__title',
      summary: '.c-post1__text',
      thumbnail: 'img',
      publishedAt: '.c-post1__box',
      detailUrl: '.c-post1__title'
    }
  },
  {
    name: 'marvelous',
    displayName: 'マーベラス',
    baseUrl: 'http://www.marvelcompany.co.jp',
    newsListUrl: 'http://www.marvelcompany.co.jp/marvelous/',
    selectors: {
      newsItems: 'article.media',
      title: 'h1.media-heading.entry-title a',
      summary: '.entry-summary, p',
      thumbnail: 'img',
      publishedAt: '.entry-meta',
      detailUrl: 'h1.media-heading.entry-title a'
    }
  },
  {
    name: 'purej',
    displayName: 'PURE-J',
    baseUrl: 'https://pure-j.jp',
    newsListUrl: 'https://pure-j.jp/#news',
    selectors: {
      newsItems: '#news h3.elementor-heading-title',
      title: 'h3.elementor-heading-title',
      summary: '.excerpt, .summary, p',
      thumbnail: 'img',
      publishedAt: 'time',
      detailUrl: 'section[data-ha-element-link]'
    }
  },
  {
    name: 'gokigenpro',
    displayName: 'ゴキゲンプロレス',
    baseUrl: 'https://gokigenpro.com',
    newsListUrl: 'https://gokigenpro.com/category/news/',
    selectors: {
      newsItems: 'article',
      title: 'h2.entry-card-title',
      summary: '.entry-card-snippet',
      thumbnail: '.entry-card-thumb-image',
      publishedAt: '.entry-date',
      detailUrl: 'article'
    }
  },
  {
    name: 'jto',
    displayName: 'JUST TAP OUT',
    baseUrl: 'https://prowrestlingjto.com',
    newsListUrl: 'https://prowrestlingjto.com/',
    selectors: {
      newsItems: '.p-postList__item',
      title: '.p-postList__title',
      summary: '.p-postList__excerpt',
      thumbnail: '.c-postThumb__figure img',
      publishedAt: '.c-postTimes__posted.icon-posted',
      detailUrl: 'a'
    }
  }
];