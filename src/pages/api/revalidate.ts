import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-revalidate-secret') ||
                 new URL(request.url).searchParams.get('secret');

  if (!secret || secret !== import.meta.env.REVALIDATE_SECRET) {
    return new Response(JSON.stringify({ error: 'Invalid secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const path = url.searchParams.get('path');

  // Determine the path to revalidate
  const revalidatePath = path || (slug ? `/blog/${slug}` : null);

  if (!revalidatePath) {
    return new Response(
      JSON.stringify({ error: 'Missing slug or path parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Return response with revalidation header for Vercel ISR
  return new Response(
    JSON.stringify({
      revalidated: true,
      path: revalidatePath,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'x-prerender-revalidate': import.meta.env.REVALIDATE_SECRET || '',
      },
    }
  );
};

export const GET: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({
      message: 'Use POST to revalidate. Params: secret (required), slug or path (required)',
      example: 'POST /api/revalidate?secret=your-secret&slug=my-blog-post',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
