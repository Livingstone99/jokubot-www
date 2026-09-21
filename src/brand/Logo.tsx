type MarkProps = {
  size?: number;
};

export function JokubotMark({ size = 24 }: MarkProps) {
  return (
    <img
      className="jokubot-mark"
      src={`${import.meta.env.BASE_URL}jokubot-bot.png`}
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
