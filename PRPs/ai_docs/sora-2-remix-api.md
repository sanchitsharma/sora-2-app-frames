# Sora 2 API Remix Feature Reference

## Official Documentation
- **API Guide**: https://platform.openai.com/docs/guides/video-generation
- **Model Docs**: https://platform.openai.com/docs/models/sora-2
- **Cookbook**: https://cookbook.openai.com/examples/sora/sora2_prompting_guide

## Parameter Specifications

### Required Parameters
```typescript
{
  model: "sora-2" | "sora-2-pro",
  prompt: string,  // New prompt describing desired changes
  size: "1280x720" | "720x1280" | "1792x1024" | "1024x1792",
  seconds: "4" | "8" | "12"  // Must be STRING format
}
```

### Remix-Specific Parameter
```typescript
{
  remix_video_id: string  // Format: "video_<alphanumeric>"
  // Example: "video_68f10c5428708190a98980c2d2b21a78"
}
```

### API Endpoint Options
1. POST /v1/videos with `remix_video_id` parameter
2. POST /v1/videos/{video_id}/remix

## Critical Limitations

### 24-Hour Expiration Window ⚠️
- Videos are only available for remixing for **24 hours** after creation
- After 24 hours, the video_id becomes invalid
- Track creation timestamps to warn users before expiration

### Response Format
```json
{
  "id": "video_abc123",
  "status": "queued" | "in_progress" | "completed" | "failed",
  "progress": 0-100,
  "remixed_from_video_id": "video_xyz789"  // Links to parent
}
```

## Best Practices

### Prompting Strategy
✅ DO: Make singular, controlled changes
- "same shot, switch to 85 mm"
- "same lighting, new palette: teal, sand, rust"
- "same scene, add morning fog"

❌ DON'T: Make multiple changes at once
- "change lighting, make car blue, add people, aerial view" (too many changes)

### Remix Philosophy
> "Remix is for nudging, not gambling. Use it to make controlled changes – one at a time."

## Code Example
```typescript
// Create remix
const video = await client.videos.create({
  model: "sora-2",
  prompt: "same shot, switch to 85 mm",
  remix_video_id: "video_68f10c5428708190a98980c2d2b21a78",
  size: "1280x720",
  seconds: "8"
});

// Poll for completion
while (video.status === 'queued' || video.status === 'in_progress') {
  await new Promise(resolve => setTimeout(resolve, 2000));
  video = await client.videos.retrieve(video.id);
}

// Download when complete
if (video.status === 'completed') {
  const content = await client.videos.content(video.id);
  // Save video
}
```

## Common Gotchas

1. **Parameter Format**: `seconds` must be STRING, not number
2. **Snake Case**: Use `remix_video_id` in API calls (not camelCase)
3. **24-Hour Window**: Implement timestamp tracking
4. **Job Limits**: Max 2 concurrent jobs (standard), 5 (relaxed mode)
5. **Polling Interval**: 2 seconds minimum to avoid rate limiting
