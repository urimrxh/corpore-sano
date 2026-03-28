import { getVideoThumbnail } from "../script/videoHelpers";

function VideoSlide({ video, onPlay }) {
  return (
    <article
      className="video-slide"
      onClick={() => onPlay(video)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay(video);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="video-slide__media">
        <img
          src={getVideoThumbnail(video)}
          alt=""
          className="video-slide__image"
          loading="lazy"
          decoding="async"
        />
        <div className="video-slide__scrim" aria-hidden />
      </div>

      <div className="video-slide__play-wrap" aria-hidden="true">
        <span className="video-slide__play-btn">
          <svg
            className="video-slide__play-icon"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path fill="currentColor" d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="video-slide__play-label">Watch</span>
      </div>

      <div className="video-slide__footer">
        <div className="video-slide__text">
          <span className="video-slide__category">{video.category}</span>
          <h3 className="video-slide__title">{video.title}</h3>
        </div>
      </div>
    </article>
  );
}

export default VideoSlide;
