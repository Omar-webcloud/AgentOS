import { USER } from "@/lib/data";
import { CopyEmail } from "@/components/copy-email";
import { FigCaption, Panel, PanelContent, PanelHeader } from "@/components/panel";

export function Contact() {
  return (
    <Panel id="contact">
      <PanelHeader
        label="Contact"
        title="Let's build something"
        description="Open to full-time roles and freelance projects. Remote, flexible timezone, GMT +6."
      />
      <PanelContent>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${USER.email}`}
            className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2.5 font-mono text-[12px] uppercase tracking-label text-background transition-opacity hover:opacity-90"
          >
            {USER.email}
          </a>
          <CopyEmail />
          <a
            href={USER.resume}
            download
            className="border border-border px-4 py-2.5 font-mono text-[12px] uppercase tracking-label text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Résumé ↓
          </a>
        </div>

        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {[
            { label: "GitHub", value: "Omar-webcloud", href: USER.github },
            { label: "LinkedIn", value: USER.linkedinLabel, href: USER.linkedin },
            { label: "Portfolio", value: USER.website.label, href: USER.website.url },
            { label: "Agency", value: USER.company.name, href: USER.company.url },
          ].map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 border border-border px-3 py-2.5 transition-colors hover:bg-secondary"
              >
                <span className="font-mono text-[11px] uppercase tracking-label text-muted-foreground">
                  {link.label}
                </span>
                <span className="min-w-0 truncate text-sm">{link.value}</span>
                <span aria-hidden className="font-mono text-xs text-muted-foreground">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>

        <FigCaption num="9" className="mt-6">
          Fastest reply by email — usually within a day, GMT +6.
        </FigCaption>
      </PanelContent>
    </Panel>
  );
}
