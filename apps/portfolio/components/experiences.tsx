import { EDUCATION, CERTIFICATIONS, EXPERIENCES } from "@/lib/data";
import { FigCaption, Panel, PanelContent, PanelHeader } from "@/components/panel";

export function Experiences() {
  return (
    <Panel id="experience">
      <PanelHeader
        label="Experience"
        title="Work history"
        description="Client delivery at a web & software development agency."
      />
      <PanelContent className="py-0">
        <ol>
          {EXPERIENCES.map((experience) => (
            <li key={`${experience.role}-${experience.period}`} className="screen-line-top py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-mono text-base font-medium uppercase tracking-tight">
                  <a href={experience.url} className="hover:underline">
                    {experience.company} ↗
                  </a>
                </h3>
                <span className="font-mono text-[11px] uppercase tracking-label text-muted-foreground">
                  {experience.period}
                </span>
              </div>

              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                {experience.role}
                {experience.active ? (
                  <span className="inline-flex items-center gap-1.5 border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted-foreground">
                    <span className="size-1.5 animate-pulse rounded-full bg-success" />
                    Active
                  </span>
                ) : null}
              </p>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {experience.companyBlurb}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{experience.description}</p>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {experience.tools.map((tool) => (
                  <li
                    key={tool}
                    className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted-foreground"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="screen-line-top py-5">
          <p className="panel-label">Education</p>
          <h3 className="mt-1 font-mono text-base font-medium uppercase tracking-tight">
            {EDUCATION.degree}
          </h3>
          <p className="mt-1 text-sm">{EDUCATION.subject}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-label text-muted-foreground">
            → {EDUCATION.institution}
          </p>

          <p className="panel-label mt-6">Certifications</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {CERTIFICATIONS.map((cert) => (
              <li key={cert.title}>
                <a
                  href={cert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 border border-border bg-card px-3 py-2.5 transition-colors hover:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{cert.title}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-label text-muted-foreground">
                      {cert.issuer}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground"
                  >
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <PanelContent className="px-0 pb-6 pt-0">
          <FigCaption num="6">
            Two roles at the same agency: internship, then a full frontend seat.
          </FigCaption>
        </PanelContent>
      </PanelContent>
    </Panel>
  );
}
