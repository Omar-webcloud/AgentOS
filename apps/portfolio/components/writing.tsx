import { WRITING } from "@/lib/data";
import { FigCaption, Panel, PanelContent, PanelHeader } from "@/components/panel";

export function Writing() {
  return (
    <Panel id="writing">
      <PanelHeader
        label="Writing"
        title="Notes & articles"
        description="Frontend practice, performance and layout — published on my blog."
      />
      <PanelContent className="py-0">
        <ul>
          {WRITING.map((article, index) => (
            <li key={article.title} className="screen-line-top py-5">
              <a href={article.link} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-label text-muted-foreground">
                  <span className="border border-border bg-secondary px-1.5 py-0.5">
                    {article.category}
                  </span>
                  <span>{article.readTime}</span>
                  <span className="ml-auto transition-colors group-hover:text-foreground">↗</span>
                </div>
                <h3 className="mt-2 text-base font-medium leading-snug transition-colors group-hover:underline">
                  {String(index + 1).padStart(2, "0")}. {article.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>
              </a>
            </li>
          ))}
        </ul>

        <PanelContent className="px-0 pb-6 pt-0">
          <FigCaption num="8">Hosted on Bloggin&apos;, a platform I built and maintain.</FigCaption>
        </PanelContent>
      </PanelContent>
    </Panel>
  );
}
