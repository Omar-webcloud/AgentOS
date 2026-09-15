import type { ReactNode } from "react";

import { USER } from "@/lib/data";
import { LocalClock } from "@/components/local-clock";
import { CopyEmail } from "@/components/copy-email";
import { FigCaption, Panel, PanelContent, PanelHeader } from "@/components/panel";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="screen-line-top flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-32 shrink-0 font-mono text-[11px] uppercase tracking-label text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

export function Overview() {
  return (
    <Panel id="overview">
      <PanelHeader
        label="Overview"
        title="Who's building"
        description="Frontend developer working client-side first: React, Next.js and TypeScript, shipped on Vercel."
      />
      <PanelContent className="py-2">
        <dl>
          <Row label="Role">
            {USER.jobTitle}
            <span className="ml-2 inline-flex items-center gap-1.5 border border-border bg-secondary px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-label text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              {USER.availability}
            </span>
          </Row>
          <Row label="Company">
            <a href={USER.company.url} className="hover:underline">
              {USER.company.name} ↗
            </a>{" "}
            <span className="text-muted-foreground">— {USER.company.blurb}</span>
          </Row>
          <Row label="Address">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(USER.address)}`}
              className="hover:underline"
            >
              {USER.address} ↗
            </a>
          </Row>
          <Row label="Local time">
            <LocalClock /> <span className="text-muted-foreground">// {USER.utcOffsetLabel}</span>
          </Row>
          <Row label="Email">
            <span className="inline-flex flex-wrap items-center gap-2">
              <a href={`mailto:${USER.email}`} className="hover:underline">
                {USER.email}
              </a>
              <CopyEmail />
            </span>
          </Row>
          <Row label="Website">
            <a href={USER.website.url} className="hover:underline">
              {USER.website.label} ↗
            </a>
          </Row>
          <Row label="Résumé">
            <a href={USER.resume} download className="hover:underline">
              Download CV (PDF) ↓
            </a>
          </Row>
        </dl>

        <FigCaption num="2" className="mt-6">
          Contact details and current role. Résumé is the same document sent with
          applications.
        </FigCaption>
      </PanelContent>
    </Panel>
  );
}
