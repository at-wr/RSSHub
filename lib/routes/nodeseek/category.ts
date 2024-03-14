import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/category/:category',
    categories: ['bbs'],
    example: '/nodeseek/category/daily',
    parameters: { category: 'daily, tech, info, review, trade 等，可在 URL 获取' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '板块',
    maintainers: ['at-wr'],
    handler,
};

export default async (ctx) => {
    const baseUrl = 'https://www.nodeseek.com';
    const { category } = ctx.req.param();

    const { data: response } = await got(`${baseUrl}/categories/${category}`);
    const $ = load(response);

    const list = $('div.post-list-item .post-list-content')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a').first();
            return {
                title: a.text(),
                link: `${baseUrl}${a.attr('href')}`,
                pubDate: parseDate(item.find('time').attr('datetime')),
                author: item.find('.info-author a').text(),
                category: item.find('.post-category a').text(),
                description: undefined,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const { data: response } = await got(item.link);
                const $ = load(response);
                item.description = $('.post-content').first().html();
                return item;
            })
        )
    );

    return {
        title: `NodeSeek-${category}`,
        link: `${baseUrl}/categories/${category}`,
        item: items.map((item) => ({
            title: item.title,
            description: item.description,
            link: item.link,
            pubDate: item.pubDate,
            author: item.author,
            category: item.category,
        })),
        allowEmpty: true,
    };
};
