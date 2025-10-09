export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { apiKey, prompt, seconds, size, model, remixedFromVideoId } = body;

    // Validate API key format
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return new Response(JSON.stringify({ error: 'Invalid API key format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate required fields
    if (!prompt || !seconds || !model) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate seconds value (must be '4', '8', or '12')
    const secondsStr = String(seconds);
    if (!['4', '8', '12'].includes(secondsStr)) {
      return new Response(JSON.stringify({
        error: `Invalid seconds value: must be '4', '8', or '12', got '${secondsStr}'`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Forward request to OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        seconds: secondsStr, // Ensure it's a string
        ...(size && { size }),
        ...(remixedFromVideoId && { remixed_from_video_id: remixedFromVideoId })
      }),
    });

    // Check for errors
    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      return new Response(
        JSON.stringify({ error: error.error?.message || 'OpenAI API error' }),
        {
          status: openaiResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return OpenAI response
    const data = await openaiResponse.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
