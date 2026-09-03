export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <rect width="28" height="28" rx="7" fill="#d08a3a" />
      <path
        d="M7 9.2h14M9.5 14h11.5M12 18.8h9"
        stroke="#1a1510"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GoogleG({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.2 0 10.1 0 12s.5 3.8 1.4 5.5l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

export function ChatGptMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#10a37f" aria-hidden>
      <path d="M22.3 10.1a5.4 5.4 0 0 0-.6-5.1 5.5 5.5 0 0 0-6-2.4A5.5 5.5 0 0 0 8.2 1a5.4 5.4 0 0 0-3.7 3.3 5.5 5.5 0 0 0-3.7 6.6 5.4 5.4 0 0 0 .6 5.1 5.5 5.5 0 0 0 6 2.4A5.5 5.5 0 0 0 15.8 23a5.4 5.4 0 0 0 3.7-3.3 5.5 5.5 0 0 0 3.7-6.6 5.5 5.5 0 0 0-.9-3zM16.2 20.7a4.1 4.1 0 0 1-2.6-1l.1-.04 4.3-2.5a.7.7 0 0 0 .3-.6v-6.1l-1.8 1v4.6a2 2 0 0 1-1 1.8l-4.3 2.5a4.1 4.1 0 0 1 5-1.7zm-9.4-4 4.3 2.5v-2l-2.5-1.4a.7.7 0 0 1-.3-.6V8.6L6.4 9.6v5.3a4.1 4.1 0 0 0 .4 1.8zm-1.1-9.1.1-.05 4.3-2.5-1.8-1-4.3 2.5a2 2 0 0 0-1 1.8v5.1l1.8-1V8.5a.7.7 0 0 1 .3-.6zM17.3 11v-2.9a.7.7 0 0 0-.3-.6l-4.3-2.5v2l2.5 1.4c.2.1.3.4.3.6v6.3l1.8-1V11zm2.2 5.3v-5.1l-1.8 1v4.6a.7.7 0 0 1-.3.6l-4.3 2.5v2l4.3-2.5a2 2 0 0 0 1-1.8 4 4 0 0 0 1.1-.3zM8.6 13.4l2.5 1.4 2.5-1.4V10.6L11.1 9.2 8.6 10.6v2.8z" />
    </svg>
  );
}

export function GeminiMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="agentos-gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4b64e8" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        fill="url(#agentos-gem)"
        d="M12 1.5c.4 4.6 2.2 8.2 6.5 10.5C14.2 14.3 12.4 17.9 12 22.5 11.6 17.9 9.8 14.3 5.5 12 9.8 9.7 11.6 6.1 12 1.5z"
      />
    </svg>
  );
}

export function GrokMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#111" />
      <path d="M7 7h3.2l3.3 4.4L16.8 7H20l-5.1 6.4L20 17h-3.2l-3.4-4.5L10.2 17H7l5.2-6.5L7 7z" fill="#f4efe6" />
    </svg>
  );
}

export function BrainMark({ id, className }: { id: string; className?: string }) {
  if (id === "chatgpt") return <ChatGptMark className={className} />;
  if (id === "gemini") return <GeminiMark className={className} />;
  if (id === "grok") return <GrokMark className={className} />;
  return <Mark className={className} />;
}
