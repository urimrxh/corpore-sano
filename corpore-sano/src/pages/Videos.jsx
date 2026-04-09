import { useMemo, useState } from "react";
import { useSiteContent } from "../context/SiteContentContext";
import { useI18n } from "../context/I18nContext";
import { getEmbedUrl } from "../script/videoHelpers";
import VideoSlide from "../components/VideoSlide";
import "../style/videoSwiper.css";

function VideosPage() {
  const { content } = useSiteContent();
  const { t } = useI18n();
  const { title, intro } = content.videosPage;

  const videos = useMemo(
    () => content.videos.filter((v) => v.isPublished),
    [content.videos],
  );
  const [activeVideo, setActiveVideo] = useState(null);

  if (!videos.length) {
    return (
      <section className="container py-10 md:py-14">
        <p className="text-[#103152] dark:text-[#e8ecf1]">{t("videos.empty")}</p>
      </section>
    );
  }

  return (
    <section className="container py-10 md:py-14">
      <h1 className="text-[#103152] dark:text-[#e8ecf1] text-2xl md:text-3xl font-semibold mb-6">
        {title}
      </h1>
      <p className="text-[#103152]/80 dark:text-[#b8c4d0] mb-8 max-w-2xl">{intro}</p>

      <div className="videos-page-grid">
        {videos.map((video) => (
          <div key={video.id} className="videos-page-grid__cell">
            <VideoSlide video={video} onPlay={setActiveVideo} />
          </div>
        ))}
      </div>

      {activeVideo && (
        <div className="video-modal" onClick={() => setActiveVideo(null)}>
          <div
            className="video-modal__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="video-modal__close"
              type="button"
              onClick={() => setActiveVideo(null)}
            >
              ✕
            </button>

            <div className="video-modal__player">
              <iframe
                src={getEmbedUrl(activeVideo)}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default VideosPage;
