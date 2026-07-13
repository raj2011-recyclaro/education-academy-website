import { useEffect, useRef, useState } from "react";

const CDN_BASE = import.meta.env.VITE_VIDEO_CDN_BASE || "";

function resolveUrl(path) {
  if (!path) return path;
  return /^https?:\/\//.test(path) ? path : `${CDN_BASE}${path}`;
}

// Muted, looping preview for course covers. Only starts fetching once the
// card scrolls into view, so 8 of these on one page don't fight for bandwidth.
export function CoverVideo({ src, poster, className = "" }) {
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className={`cover-video ${className}`}
      poster={resolveUrl(poster)}
      src={inView ? resolveUrl(src) : undefined}
      preload="none"
      muted
      loop
      playsInline
      autoPlay={inView}
    />
  );
}

// Full-quality video, uncompressed, that never downloads a byte until the
// user clicks play. Reuses the site's existing video-thumb/play styling.
export function ClickToPlayVideo({ src, poster, label = "Preview", large = false }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const handlePlay = () => {
    setPlaying(true);
    requestAnimationFrame(() => videoRef.current?.play());
  };

  if (playing) {
    return (
      <video
        ref={videoRef}
        className={large ? "video-thumb large" : "video-thumb"}
        src={resolveUrl(src)}
        poster={resolveUrl(poster)}
        controls
        playsInline
        preload="none"
      />
    );
  }

  return (
    <button
      type="button"
      className={large ? "video-thumb large" : "video-thumb"}
      style={{ backgroundImage: `url(${resolveUrl(poster)})`, border: 0, cursor: "pointer" }}
      onClick={handlePlay}
    >
      <span className="video-label">{label}</span>
      <span className="play">▶</span>
    </button>
  );
}
