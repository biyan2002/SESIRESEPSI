import React from "react";

const items = [
  "Raw Content",
  "Unlimited Footage",
  "Behind the Scene",
  "Same Day Edit",
  "Reels & TikTok",
  "Cinematic Highlight",
];

const Marquee = () => {
  const row = (
    <div className="marquee-track" aria-hidden="false">
      {items.concat(items).map((t, i) => (
        <span
          key={i}
          className="font-italiana text-2xl md:text-3xl uppercase tracking-widest px-6 whitespace-nowrap flex items-center gap-6"
        >
          {t}
          <span className="inline-block w-2 h-2 rounded-full bg-rose-200" />
        </span>
      ))}
    </div>
  );
  return (
    <div
      data-testid="marquee-band"
      className="marquee bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600 text-white py-5 border-y border-rose-400/40"
    >
      {row}
      {row}
    </div>
  );
};

export default Marquee;
