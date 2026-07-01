export function getYouTubeThumbnailUrl(videoId: string): string {
  // Try maxresdefault first (highest quality), then fall back to lower quality
  // This is just for constructing the URL - actual error handling will be in the component
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function getThumbnailUrlsWithFallback(videoId: string): string[] {
  return [
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`,
  ];
}

