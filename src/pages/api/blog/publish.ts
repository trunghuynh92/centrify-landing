import type { APIRoute } from 'astro';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const prerender = false;

interface BlogPostPayload {
  title: string;
  description: string;
  content: string;
  tags?: string[];
  author?: string;
  draft?: boolean;
  image?: string;
  imageAlt?: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function createFrontmatter(data: BlogPostPayload): string {
  const frontmatter: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    date: formatDate(new Date()),
    author: data.author || 'Centrify Team',
    tags: data.tags || [],
    draft: data.draft ?? false,
  };

  if (data.image) {
    frontmatter.image = data.image;
    if (data.imageAlt) {
      frontmatter.imageAlt = data.imageAlt;
    }
  }

  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');

  return lines.join('\n');
}

export const POST: APIRoute = async ({ request }) => {
  // Check API key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = import.meta.env.BLOG_API_KEY;

  if (!expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: BLOG_API_KEY not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body
  let payload: BlogPostPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate required fields
  if (!payload.title || !payload.description || !payload.content) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: title, description, content' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Generate slug and file content
  const slug = generateSlug(payload.title);
  const frontmatter = createFrontmatter(payload);
  const fileContent = `${frontmatter}\n\n${payload.content.trim()}\n`;

  // Write file
  const blogDir = join(process.cwd(), 'src', 'content', 'blog');
  const filePath = join(blogDir, `${slug}.md`);

  try {
    await writeFile(filePath, fileContent, 'utf-8');
  } catch (err) {
    console.error('Failed to write blog post:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to write blog post file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      slug,
      path: `/blog/${slug}`,
      message: 'Blog post created. Rebuild required to publish.',
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};
