import { PROJECTS } from "@/lib/data";
import { FigCaption, Panel, PanelContent, PanelHeader } from "@/components/panel";

function ProjectImage({ src, dark, alt }: { src: string; dark?: string; alt: string }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden border border-border bg-secondary">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`absolute inset-0 size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02] ${
          dark ? "dark:hidden" : ""
        }`}
      />
      {dark ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={dark}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 hidden size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02] dark:block"
        />
      ) : null}
    </div>
  );
}

export function Projects() {
  return (
    <Panel id="work">
      <PanelHeader
        label="Selected work"
        title="Projects"
        sup={String(PROJECTS.length)}
        description="Shipped products: storefronts, dashboards, platforms and tools. Live links plus source."
      />
      <PanelContent className="py-0">
        <ol>
          {PROJECTS.map((project) => (
            <li key={project.num} className="screen-line-top py-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-muted-foreground">{project.num}</span>
                <h3 className="font-mono text-lg font-medium uppercase tracking-tight">
                  <a href={project.link} className="hover:underline">
                    {project.title} ↗
                  </a>
                </h3>
                <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-label text-muted-foreground">
                  {project.type}
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
                <a
                  href={project.link}
                  className="group block"
                  aria-label={`${project.title} — open live site`}
                >
                  <ProjectImage src={project.image} dark={project.imageDark} alt={project.title} />
                </a>

                <div>
                  <p className="text-sm leading-relaxed">{project.description}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {project.stack.map((tech) => (
                      <li
                        key={tech}
                        className="border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted-foreground"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-label">
                    <a href={project.link} className="text-foreground hover:underline">
                      Live ↗
                    </a>
                    <a
                      href={project.github}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Source ↗
                    </a>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <PanelContent className="px-0 pb-6 pt-0">
          <FigCaption num="7">
            Light and dark screenshots swap with the theme toggle. More work lives on{" "}
            <a href="https://github.com/Omar-webcloud" className="hover:underline">
              GitHub
            </a>
            .
          </FigCaption>
        </PanelContent>
      </PanelContent>
    </Panel>
  );
}
