"use client";

import { useEffect, useState } from "react";

import { USER } from "@/lib/data";

/** Rotating one-liner under the name, as on the reference profile header. */
function FlipSentence() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % USER.flipSentences.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="relative block h-6 overflow-hidden">
      {USER.flipSentences.map((sentence, i) => (
        <span
          key={sentence}
          aria-hidden={i !== index}
          className="absolute inset-x-0 top-0 transition-all duration-500 ease-out"
          style={{
            transform: `translateY(${(i - index) * 100}%)`,
            opacity: i === index ? 1 : 0,
          }}
        >
          {sentence}
        </span>
      ))}
    </span>
  );
}

export function ProfileHeader() {
  return (
    <div id="top" className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="panel-label">Mohammad Omar — portfolio</p>
          <h1 className="mt-2 font-mono text-4xl font-medium tracking-tight sm:text-5xl">
            {USER.displayName}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            <FlipSentence />
          </p>
          <dl className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-label text-muted-foreground">
            <dt className="sr-only">Role</dt>
            <dd className="text-foreground">{USER.jobTitle}</dd>
            <span aria-hidden className="size-1 bg-border" />
            <dt className="sr-only">Company</dt>
            <dd>
              <a href={USER.company.url} className="hover:underline">
                @ {USER.company.name}
              </a>
            </dd>
            <span aria-hidden className="size-1 bg-border" />
            <dt className="sr-only">Location</dt>
            <dd>{USER.address}</dd>
          </dl>
        </div>

        <figure className="shrink-0">
          <div className="relative w-40 border border-border bg-secondary p-2 sm:w-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={USER.avatar}
              alt={USER.fullName}
              width={192}
              height={192}
              className="aspect-square w-full object-cover object-top"
            />
            <span className="absolute -bottom-px left-2 border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted-foreground">
              Fig. 1
            </span>
          </div>
          <figcaption className="mt-2 max-w-48 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {USER.fullName}, Chattogram BD
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
