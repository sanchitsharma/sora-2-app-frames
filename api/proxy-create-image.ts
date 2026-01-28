export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const {
      provider = 'openai',
      providerConfig,
      apiKey,
      prompt,
      size,
      model,
      count,
    } = body || {};

    const selectedProvider = provider === 'azure' ? 'azure' : 'openai';
    const azureSettings = providerConfig?.azure;
    const normalizeEndpoint = (value: string) => value.replace(/\/+$/, '');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (selectedProvider === 'openai' && !String(apiKey).startsWith('sk-')) {
      return new Response(JSON.stringify({ error: 'Invalid API key format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!prompt || !size || !model) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (selectedProvider === 'azure') {
      if (!azureSettings?.endpoint || !azureSettings?.apiKey) {
        return new Response(JSON.stringify({ error: 'Missing Azure settings' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (azureSettings.apiType === 'deployments' && !azureSettings.apiVersion) {
        return new Response(JSON.stringify({ error: 'Missing Azure api-version' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const isAzure = selectedProvider === 'azure';
    const azureEndpoint = isAzure ? normalizeEndpoint(azureSettings.endpoint) : '';
    const azureApiType = isAzure ? (azureSettings.apiType || 'v1') : 'v1';
    const authHeaders = isAzure
      ? { 'api-key': String(apiKey) }
      : { 'Authorization': `Bearer ${apiKey}` };

    const azureDeployment =
      azureSettings?.imageDeployment ||
      azureSettings?.plannerDeployment ||
      azureSettings?.videoDeployment;

    if (isAzure && !azureDeployment) {
      return new Response(JSON.stringify({ error: 'Missing Azure image deployment' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const buildAzureUrl = (path: string) => {
      if (azureApiType === 'deployments') {
        const apiVersion = encodeURIComponent(azureSettings.apiVersion);
        return `${azureEndpoint}/openai/deployments/${azureDeployment}${path}?api-version=${apiVersion}`;
      }
      return `${azureEndpoint}/openai/v1${path}`;
    };

    const createPath = '/images/generations';
    const createUrl = isAzure ? buildAzureUrl(createPath) : 'https://api.openai.com/v1/images/generations';
    const includeModel = !isAzure || azureApiType === 'v1';

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(includeModel && { model }),
        prompt,
        size,
        n: count || 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({ error: error.error?.message || 'OpenAI API error' }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
