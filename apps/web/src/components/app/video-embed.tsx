/** YouTube / Vimeo linki və ya birbaşa fayl */
export function VideoEmbed({
  url,
  assetMap = {},
}: {
  url: string;
  assetMap?: Record<string, string>;
}) {
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i.exec(url);
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url);
  if (yt) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-navy-line bg-black">
        <iframe
          className="size-full"
          src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (vimeo) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-navy-line bg-black">
        <iframe
          className="size-full"
          src={`https://player.vimeo.com/video/${vimeo[1]}`}
          title="Video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  const src = /^https?:\/\//i.test(url) ? url : (assetMap[url.replace(/^\.?\//, '')] ?? url);
  return (
    <video controls className="w-full rounded-xl border border-navy-line bg-black" src={src} />
  );
}
