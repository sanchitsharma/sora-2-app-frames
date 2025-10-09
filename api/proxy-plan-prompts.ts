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

CRITICAL: ALL people in prompts MUST be "animated style like Pixar" (NOT photorealistic).

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
4) All people must be animated Pixar style
5) Brand-safe, family-friendly content
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
    const { apiKey, basePrompt, secondsPerSegment, numGenerations } = body;

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return new Response(JSON.stringify({ error: 'Invalid API key format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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

    // Call OpenAI Chat API (GPT-4 or similar)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or 'gpt-4-turbo'
        messages: [
          { role: 'system', content: PLANNER_SYSTEM_INSTRUCTIONS },
          { role: 'user', content: userInput }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
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
