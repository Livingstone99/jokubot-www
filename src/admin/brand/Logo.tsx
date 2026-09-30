type MarkProps = {
  size?: number;
};

/** Isolated round 3D bot on a transparent plate. */
export function JokubotMark({ size = 24 }: MarkProps) {
  return (
    <img
      className="jokubot-mark"
      src="/jokubot-bot.png"
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

export function JokubotWordmark() {
  return <span className="wordmark">jokubot</span>;
}
