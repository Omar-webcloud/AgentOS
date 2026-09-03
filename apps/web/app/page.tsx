"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { BRAINS, type BrainId } from "@/lib/brains";
import { BrainMark, Mark } from "@/components/mark";
import { GooglePicker } from "@/components/google-picker";

export default function Landing() {
  const [authed, setAuthed] = useState(false);
  const [picker, setPicker] = useState<{ open: boolean; brain: BrainId | null }>({
    open: false,
    brain: null,
  });
  useEffect(() => setAuthed(Boolean(getToken())), []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-base-950 text-slate-200">
      <div className="paper-grain pointer-events-none absolute inset-0" />

      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Mark className="h-7 w-7" />
          <span className="font-serif text-[17px] text-paper">AgentOS</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-slate-400">
          <a href="#how" className="hover:text-paper">
            How it works
          </a>
          <Link
            href={authed ? "/dashboard" : "/login"}
            className="rounded-full bg-copper px-4 py-1.5 font-medium text-ink hover:bg-copper-dim"
          >
            {authed ? "Open outline" : "Sign in"}
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pb-16 pt-16 text-center md:pt-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-copper">Not a chatbot</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight text-paper md:text-7xl">
          An outline
          <br />
          for agents.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
          Sign up with ChatGPT, Gemini, or Grok — using your Google account.
          AgentOS does one thing: trigger the tasks those agents already know how to do.
        </p>
      </section>

      <section className="relative mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 md:grid-cols-3">
        {BRAINS.map((b) => (
          <button
            key={b.id}
            onClick={() => (authed ? (window.location.href = "/dashboard") : setPicker({ open: true, brain: b.id }))}
            className="group rounded-3xl border border-base-700 bg-base-900/70 p-6 text-left transition hover:-translate-y-0.5 hover:border-copper/50 hover:bg-base-850"
          >
            <BrainMark id={b.id} className="h-10 w-10" />
            <h2 className="mt-4 font-serif text-2xl text-paper">{b.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{b.blurb}</p>
            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-copper">
              Continue with Google
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        ))}
      </section>

      <section id="how" className="relative mx-auto mt-24 max-w-3xl px-6 pb-28">
        <div className="rounded-[28px] border border-[#d7c9ae]/30 bg-paper px-8 py-10 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:px-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#8a7048]">The outline</p>
          <h2 className="mt-2 font-serif text-3xl">I. Agents you trigger.</h2>
          <ol className="mt-8 space-y-6 font-serif">
            <li>
              <div className="text-lg">I. Code Reviewer</div>
              <ol className="mt-2 space-y-1 pl-7 text-[15px] text-[#5c5348]">
                <li>A. Fetch the pull request</li>
                <li>B. Read the diff</li>
                <li>C. Post the review</li>
              </ol>
            </li>
            <li>
              <div className="text-lg">II. Support Agent</div>
              <ol className="mt-2 space-y-1 pl-7 text-[15px] text-[#5c5348]">
                <li>A. Look up the customer</li>
                <li>B. Issue the refund — paused if it needs you</li>
              </ol>
            </li>
          </ol>
          <p className="mt-8 border-t border-[#d7c9ae] pt-6 text-sm leading-relaxed text-[#5c5348]">
            You are not building a platform here. You pick a brain, you hit trigger,
            the outline runs. ChatGPT, Gemini, Grok — same Google account, same list of agents.
          </p>
        </div>
      </section>

      <footer className="border-t border-base-800 py-8 text-center text-xs text-slate-600">
        AgentOS — an outline for agents. Trigger only.
      </footer>

      <GooglePicker
        open={picker.open}
        brain={picker.brain}
        onClose={() => setPicker({ open: false, brain: null })}
      />
    </main>
  );
}
