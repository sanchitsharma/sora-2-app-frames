export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const videoId = url.searchParams.get('videoId');
  const apiKey = req.headers.get('x-api-key');
  const provider = url.searchParams.get('provider') || 'openai';
  const providerConfigRaw = url.searchParams.get('providerConfig');
  let providerConfig: any = null;
  if (providerConfigRaw) {
    try {
      providerConfig = JSON.parse(providerConfigRaw);
    } catch {
      providerConfig = null;
    }
  }

  if (!videoId || !apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing videoId or API key' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const selectedProvider = provider === 'azure' ? 'azure' : 'openai';
  const azureSettings = providerConfig?.azure;
  const normalizeEndpoint = (value: string) => value.replace(/\/+$/, '');

  // Validate API key format (OpenAI only)
  if (selectedProvider === 'openai' && !apiKey.startsWith('sk-')) {
    return new Response(
      JSON.stringify({ error: 'Invalid API key format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
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

  try {
    const isAzure = selectedProvider === 'azure';
    const azureEndpoint = isAzure ? normalizeEndpoint(azureSettings.endpoint) : '';
    const azureApiType = isAzure ? (azureSettings.apiType || 'v1') : 'v1';

    const statusUrl =
      isAzure && azureApiType === 'deployments'
        ? `${azureEndpoint}/openai/deployments/${azureSettings.videoDeployment}/videos/${videoId}?api-version=${encodeURIComponent(azureSettings.apiVersion)}`
        : isAzure
          ? `${azureEndpoint}/openai/v1/videos/${videoId}`
          : `https://api.openai.com/v1/videos/${videoId}`;

    const headers =
      isAzure
        ? { 'api-key': apiKey }
        : { 'Authorization': `Bearer ${apiKey}` };

    const response = await fetch(statusUrl, { headers });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({ error: error.error?.message || 'API error' }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
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
