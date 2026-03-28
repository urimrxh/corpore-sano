export function getYouTubeId(url) {
  if (!url) return null;

  if (url.includes("youtube.com/watch?v=")) {
    return url.split("v=")[1]?.split("&")[0] || null;
  }

  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1]?.split("?")[0] || null;
  }

  if (url.includes("youtube.com/embed/")) {
    return url.split("embed/")[1]?.split("?")[0] || null;
  }

  return null;
}

export function getVideoThumbnail(video) {
  const youtubeId = getYouTubeId(video.videoUrl);

  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  return "https://via.placeholder.com/600x900?text=Video";
}

export function getEmbedUrl(video) {
  const youtubeId = getYouTubeId(video.videoUrl);

  if (!youtubeId) return video.videoUrl;

  const params = new URLSearchParams();

  if (typeof video.startAt === "number" && video.startAt > 0) {
    params.set("start", String(video.startAt));
  }

  if (typeof video.endAt === "number" && video.endAt > 0) {
    params.set("end", String(video.endAt));
  }

  params.set("autoplay", "1");
  params.set("rel", "0");
  params.set("modestbranding", "1");

  return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
}