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
    let apiKey, prompt, seconds, size, model, remixedFromVideoId, inputReference, firstFrame, lastFrame;
    let provider = 'openai';
    let providerConfig: any = null;

    // Handle both JSON and multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      provider = String(formData.get('provider') || 'openai');
      const providerConfigRaw = formData.get('providerConfig');
      if (providerConfigRaw) {
        try {
          providerConfig = JSON.parse(String(providerConfigRaw));
        } catch {
          providerConfig = null;
        }
      }
      apiKey = formData.get('apiKey');
      prompt = formData.get('prompt');
      seconds = formData.get('seconds');
      size = formData.get('size');
      model = formData.get('model');
      remixedFromVideoId = formData.get('remixedFromVideoId');
      inputReference = formData.get('inputReference'); // File object
      firstFrame = formData.get('firstFrame');
      lastFrame = formData.get('lastFrame');
    } else {
      const body = await req.json();
      provider = body.provider || 'openai';
      providerConfig = body.providerConfig || null;
      apiKey = body.apiKey;
      prompt = body.prompt;
      seconds = body.seconds;
      size = body.size;
      model = body.model;
      remixedFromVideoId = body.remixedFromVideoId;
    }

    const selectedProvider = provider === 'azure' ? 'azure' : 'openai';
    const azureSettings = providerConfig?.azure;
    const normalizeEndpoint = (value: string) => value.replace(/\/+$/, '');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate API key format for OpenAI
    if (selectedProvider === 'openai' && !String(apiKey).startsWith('sk-')) {
      return new Response(JSON.stringify({ error: 'Invalid API key format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (selectedProvider === 'azure') {
      if (!azureSettings?.endpoint || !azureSettings?.videoDeployment) {
        return new Response(JSON.stringify({ error: 'Missing Azure settings' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (azureSettings.apiType === 'deployments' && !azureSettings.apiVersion) {
        return new Response(JSON.stringify({ error: 'Missing Azure api-version' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
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

    // Forward request to OpenAI or Azure OpenAI
    // If remixing, use the remix endpoint; otherwise use create endpoint
    let openaiResponse;
    const isAzure = selectedProvider === 'azure';
    const azureEndpoint = isAzure ? normalizeEndpoint(azureSettings.endpoint) : '';
    const azureApiType = isAzure ? (azureSettings.apiType || 'v1') : 'v1';
    const authHeaders = isAzure
      ? { 'api-key': String(apiKey) }
      : { 'Authorization': `Bearer ${apiKey}` };

    const buildAzureUrl = (path: string) => {
      if (azureApiType === 'deployments') {
        const apiVersion = encodeURIComponent(azureSettings.apiVersion);
        return `${azureEndpoint}/openai/deployments/${azureSettings.videoDeployment}${path}?api-version=${apiVersion}`;
      }
      return `${azureEndpoint}/openai/v1${path}`;
    };

    const allowStartEndFrames = selectedProvider === 'azure';

    if (remixedFromVideoId) {
      const remixPath = `/videos/${remixedFromVideoId}/remix`;
      const remixUrl = isAzure ? buildAzureUrl(remixPath) : `https://api.openai.com/v1${remixPath}`;

      if (inputReference || (allowStartEndFrames && (firstFrame || lastFrame))) {
        const openaiFormData = new FormData();
        openaiFormData.append('prompt', prompt);
        if (inputReference) {
          openaiFormData.append('input_reference', inputReference);
        }
        if (allowStartEndFrames && firstFrame) {
          openaiFormData.append('first_frame', firstFrame);
        }
        if (allowStartEndFrames && lastFrame) {
          openaiFormData.append('last_frame', lastFrame);
        }

        openaiResponse = await fetch(remixUrl, {
          method: 'POST',
          headers: authHeaders,
          body: openaiFormData,
        });
      } else {
        openaiResponse = await fetch(remixUrl, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt
          }),
        });
      }
    } else {
      const createPath = '/videos';
      const createUrl = isAzure ? buildAzureUrl(createPath) : 'https://api.openai.com/v1/videos';
      const includeModel = !isAzure || azureApiType === 'v1';

      if (inputReference || (allowStartEndFrames && (firstFrame || lastFrame))) {
        const openaiFormData = new FormData();
        if (includeModel) openaiFormData.append('model', model);
        openaiFormData.append('prompt', prompt);
        openaiFormData.append('seconds', secondsStr);
        if (size) openaiFormData.append('size', size);
        if (inputReference) {
          openaiFormData.append('input_reference', inputReference);
        }
        if (allowStartEndFrames && firstFrame) {
          openaiFormData.append('first_frame', firstFrame);
        }
        if (allowStartEndFrames && lastFrame) {
          openaiFormData.append('last_frame', lastFrame);
        }

        openaiResponse = await fetch(createUrl, {
          method: 'POST',
          headers: authHeaders,
          body: openaiFormData,
        });
      } else {
        openaiResponse = await fetch(createUrl, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...(includeModel && { model }),
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
