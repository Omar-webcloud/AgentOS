import { SKILLS } from "@/lib/data";
import { FigCaption, Panel, PanelContent, PanelHeader } from "@/components/panel";

export function TechStack() {
  return (
    <Panel id="stack">
      <PanelHeader
        label="Tech stack"
        title="What I build with"
        description="Grouped by where it lands in the stack, not by how trendy it is."
      />
      <PanelContent className="space-y-6">
        {SKILLS.map((group) => (
          <div key={group.title}>
            <div className="screen-line-top flex items-center gap-3 pt-3">
              <h3 className="font-mono text-[11px] uppercase tracking-label text-foreground">
                {group.title}
              </h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                {String(group.items.length).padStart(2, "0")}
              </span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:bg-accent"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <FigCaption num="5">
          Everyday tools for client work at Webermelon plus the side projects below.
        </FigCaption>
      </PanelContent>
    </Panel>
  );
}
