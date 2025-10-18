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
    const contentType = req.headers.get('content-type') || '';
    let apiKey, prompt, seconds, size, model, remixedFromVideoId, inputReference;

    // Handle both JSON and multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      apiKey = formData.get('apiKey');
      prompt = formData.get('prompt');
      seconds = formData.get('seconds');
      size = formData.get('size');
      model = formData.get('model');
      remixedFromVideoId = formData.get('remixedFromVideoId');
      inputReference = formData.get('inputReference'); // File object
    } else {
      const body = await req.json();
      apiKey = body.apiKey;
      prompt = body.prompt;
      seconds = body.seconds;
      size = body.size;
      model = body.model;
      remixedFromVideoId = body.remixedFromVideoId;
    }

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
    // If remixing, use the remix endpoint; otherwise use create endpoint
    let openaiResponse;

    if (remixedFromVideoId) {
      // Use remix endpoint: POST /v1/videos/{video_id}/remix
      // NOTE: Remix endpoint only accepts 'prompt' (and optionally input_reference)
      // It inherits model, seconds, and size from the original video
      const remixUrl = `https://api.openai.com/v1/videos/${remixedFromVideoId}/remix`;

      if (inputReference) {
        const openaiFormData = new FormData();
        openaiFormData.append('prompt', prompt);
        openaiFormData.append('input_reference', inputReference);

        openaiResponse = await fetch(remixUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: openaiFormData,
        });
      } else {
        openaiResponse = await fetch(remixUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt
          }),
        });
      }
    } else {
      // Standard create endpoint
      if (inputReference) {
        const openaiFormData = new FormData();
        openaiFormData.append('model', model);
        openaiFormData.append('prompt', prompt);
        openaiFormData.append('seconds', secondsStr);
        if (size) openaiFormData.append('size', size);
        openaiFormData.append('input_reference', inputReference);

        openaiResponse = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: openaiFormData,
        });
      } else {
        openaiResponse = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            seconds: secondsStr,
            ...(size && { size })
          }),
        });
      }
    }

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
