import { ABOUT, USER } from "@/lib/data";
import { FigCaption, Panel, PanelContent, PanelHeader } from "@/components/panel";

export function Hello() {
  return (
    <Panel id="hello">
      <PanelHeader label="Hello" title="About" />
      <PanelContent>
        <ul className="space-y-4 text-sm leading-relaxed">
          {ABOUT.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden className="mt-2 size-1 shrink-0 bg-foreground" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <blockquote className="mt-6 border-l border-line pl-4 font-mono text-[13px] leading-relaxed text-muted-foreground">
          “{USER.quote}”
        </blockquote>

        <FigCaption num="4" className="mt-6">
          Roles covered: {USER.roles.join(" · ")}.
        </FigCaption>
      </PanelContent>
    </Panel>
  );
}
