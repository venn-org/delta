export function TypingIndicator() {
  return (
    <div className="venn-rise flex items-end gap-2">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white"
      >
        V
      </span>
      <div
        role="status"
        aria-label="Venn is typing"
        className="bubble-tail-bot flex gap-[5px] bg-white px-4 py-3.5"
      >
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            className="h-[7px] w-[7px] rounded-full bg-slate"
            style={{
              animation: `venn-dot 1.2s ${delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
