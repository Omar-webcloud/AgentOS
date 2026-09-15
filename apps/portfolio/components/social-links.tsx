import { USER } from "@/lib/data";
import { Panel, PanelContent, PanelHeader } from "@/components/panel";

const LINKS = [
  { label: "GitHub", value: "Omar-webcloud", href: USER.github },
  { label: "LinkedIn", value: USER.linkedinLabel, href: USER.linkedin },
  { label: "Email", value: USER.email, href: `mailto:${USER.email}` },
  { label: "Portfolio", value: USER.website.label, href: USER.website.url },
] as const;

export function SocialLinks() {
  return (
    <Panel>
      <PanelHeader label="Social links" title="Elsewhere" />
      <PanelContent className="py-0">
        <ul>
          {LINKS.map((link) => (
            <li key={link.label} className="screen-line-top">
              <a
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                className="group flex items-center justify-between gap-4 py-3 transition-colors hover:bg-secondary"
              >
                <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-label text-muted-foreground">
                  {link.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{link.value}</span>
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                >
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </PanelContent>
    </Panel>
  );
}
