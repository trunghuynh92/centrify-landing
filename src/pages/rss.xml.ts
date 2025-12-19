import rss from '@astrojs/rss';
import { getPosts } from '../lib/blog';
import type { APIContext } from 'astro';

export const prerender = false;

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: 'Centrify Blog',
    description: 'Expert insights on financial management, cash flow optimization, and business accounting best practices.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      pubDate: new Date(post.date),
      description: post.description,
      author: post.author,
      link: `/blog/${post.slug}/`,
      categories: post.tags || [],
    })),
    customData: `<language>en-us</language>`,
  });
}
