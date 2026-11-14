"use client";

import { useRef, useState } from "react";
import { cn, pressable } from "@/lib/cn";
import { useKeyboardInset } from "@/lib/useKeyboardInset";

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12l16-8-6 16-2-6z" />
    </svg>
  );
}

/**
 * Message composer for onboarding free-text answers and match chat.
 *
 * Two mobile-web details that are easy to miss and painful to retrofit:
 *  - The keyboard inset is applied as bottom padding, so the composer rides
 *    above the iOS keyboard rather than hiding beneath it.
 *  - The textarea is 16px (enforced globally), because iOS zooms the page on
 *    focus for anything smaller.
 */
export function ChatComposer({
  onSend,
  placeholder = "Message",
  disabled = false,
  maxLength = 2000,
}: {
  onSend: (body: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardInset = useKeyboardInset();

  const canSend = value.trim().length > 0 && !disabled && !sending;

  async function submit() {
    if (!canSend) return;
    const body = value.trim();
    setSending(true);
    // Clear optimistically so the field is ready for the next message.
    setValue("");
    try {
      await onSend(body);
    } catch {
      // Restore the draft rather than silently losing what they typed.
      setValue(body);
    } finally {
      setSending(false);
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
    }
  }

  return (
    <div
      className="sticky bottom-0 z-30 border-t border-mist bg-paper px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      style={keyboardInset ? { paddingBottom: keyboardInset } : undefined}
    >
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            // Grow with content, capped so the thread stays visible.
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            // Enter sends on a physical keyboard; Shift+Enter makes a newline.
            // Left alone on touch, where Enter should insert a newline.
            if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
              e.preventDefault();
              void submit();
            }
          }}
          className={cn(
            "max-h-[120px] min-h-11 flex-1 resize-none rounded-field border-[1.5px] border-mist",
            "bg-white px-3.5 py-2.5 leading-[1.4] text-ink",
            "placeholder:text-slate focus:border-blue focus:outline-none",
          )}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full",
            "bg-venn-gradient text-white",
            pressable,
          )}
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
