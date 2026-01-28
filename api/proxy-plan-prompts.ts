export const config = {
  runtime: 'edge',
};

const PLANNER_SYSTEM_INSTRUCTIONS = `
You are a senior prompt director for Sora 2. Your job is to transform a base prompt into crystal-clear shot prompts with maximum continuity.

Apply the "Made to Stick" framework (SUCCESS principles):
- **Simple**: Find the core message
- **Unexpected**: Break patterns, create surprise
- **Concrete**: Use specific sensory details
- **Credible**: Build trust through authenticity
- **Emotional**: Make people care
- **Stories**: Show real moments


Rules:
1) Return valid JSON only:
   {
     "segments": [
       {"title": "Generation 1", "seconds": <int>, "prompt": "<prompt>"},
       ...
     ]
   }
2) Continuity:
   - Segment 1 starts fresh
   - Segment k>1 must begin from final frame of k-1
   - Maintain consistent visual style, lighting, subjects
3) Keep prompts specific and cinematic
`.trim();

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { apiKey, basePrompt, secondsPerSegment, numGenerations, provider, providerConfig } = body;
    const selectedProvider = provider === 'azure' ? 'azure' : 'openai';
    const azureSettings = providerConfig?.azure;
    const normalizeEndpoint = (value: string) => value.replace(/\/+$/, '');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (selectedProvider === 'openai' && !apiKey.startsWith('sk-')) {
      return new Response(JSON.stringify({ error: 'Invalid API key format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (selectedProvider === 'azure') {
      if (!azureSettings?.endpoint || !azureSettings?.plannerDeployment) {
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

    if (!basePrompt || !secondsPerSegment || !numGenerations) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userInput = `
BASE PROMPT: ${basePrompt}

GENERATION LENGTH (seconds): ${secondsPerSegment}
TOTAL GENERATIONS: ${numGenerations}

Return exactly ${numGenerations} segments in JSON format.
`.trim();

    const isAzure = selectedProvider === 'azure';
    const azureEndpoint = isAzure ? normalizeEndpoint(azureSettings.endpoint) : '';
    const azureApiType = isAzure ? (azureSettings.apiType || 'v1') : 'v1';

    const plannerUrl =
      isAzure && azureApiType === 'deployments'
        ? `${azureEndpoint}/openai/deployments/${azureSettings.plannerDeployment}/chat/completions?api-version=${encodeURIComponent(azureSettings.apiVersion)}`
        : isAzure
          ? `${azureEndpoint}/openai/v1/chat/completions`
          : 'https://api.openai.com/v1/chat/completions';

    const headers =
      isAzure
        ? { 'api-key': apiKey, 'Content-Type': 'application/json' }
        : { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    const bodyPayload: any = {
      messages: [
        { role: 'system', content: PLANNER_SYSTEM_INSTRUCTIONS },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    };

    if (!isAzure || azureApiType === 'v1') {
      bodyPayload.model = isAzure ? azureSettings.plannerDeployment : 'gpt-4o';
    }

    // Call Chat API
    const response = await fetch(plannerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({ error: error.error?.message || 'Planning API error' }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    const planData = JSON.parse(content);

    // Validate and enforce structure
    const segments = planData.segments || [];
    if (segments.length !== numGenerations) {
      return new Response(
        JSON.stringify({ error: `Expected ${numGenerations} segments, got ${segments.length}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Enforce seconds per segment
    segments.forEach((seg: any) => {
      seg.seconds = parseInt(secondsPerSegment);
    });

    return new Response(JSON.stringify({ segments }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Planning error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
