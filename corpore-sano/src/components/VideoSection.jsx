import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import { useSiteContent } from "../context/SiteContentContext";
import { getEmbedUrl } from "../script/videoHelpers";
import VideoSlide from "./VideoSlide";
import "../style/videoSwiper.css";

function VideosSection() {
  const { content } = useSiteContent();
  const { videoSectionHeading, videosViewAllLabel } = content.home;

  const videos = useMemo(
    () => content.videos.filter((video) => video.isPublished),
    [content.videos],
  );

  const [activeVideo, setActiveVideo] = useState(null);

  if (!videos.length) return null;

  const useStaticLayout = videos.length <= 2;

  return (
    <section className="videos-section">
      <div className="container">
        <div className="videos-section__header">
          <p className="text-[#103152] dark:text-[#e8ecf1] text-[22px] md:text-[32px] font-semibold text-center pb-[20px]">
            {videoSectionHeading}
          </p>
        </div>

        {useStaticLayout ? (
          <div className="videos-static-row">
            {videos.map((video) => (
              <div key={video.id} className="videos-static-row__item">
                <VideoSlide video={video} onPlay={setActiveVideo} />
              </div>
            ))}
          </div>
        ) : (
          <div className="videos-section__slider-bleed">
            <Swiper
              modules={[Autoplay]}
              autoplay={{
                delay: 1800,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              loop={videos.length > 3}
              spaceBetween={16}
              slidesPerView={1.1}
              breakpoints={{
                480: { slidesPerView: 1.35 },
                768: { slidesPerView: 3 },
                1024: { slidesPerView: 3 },
                1280: { slidesPerView: 4},
              }}
              className="videos-slider"
            >
              {videos.map((video) => (
                <SwiperSlide key={video.id}>
                  <VideoSlide video={video} onPlay={setActiveVideo} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        <div className="videos-section__view-all-wrap">
          <Link className="videos-section__view-all py-[14px] px-[32px] md:py-[12px] md:px-[36px]" to="/videos">
            {videosViewAllLabel}
          </Link>
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
      </div>
    </section>
  );
}

export default VideosSection;
