import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** A full-height section of the column: side borders + full-bleed hairlines. */
export function Panel({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-slot="panel"
      className={cn(
        "screen-line-top screen-line-bottom scroll-mt-16 border-x",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  label,
  title,
  sup,
  description,
  className,
}: {
  label?: string;
  title: string;
  sup?: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header
      data-slot="panel-header"
      className={cn("screen-line-bottom px-4 py-5 sm:px-6", className)}
    >
      {label ? <p className="panel-label">{label}</p> : null}
      <h2 className="mt-1 font-mono text-2xl font-medium tracking-tight sm:text-3xl">
        {title}
        {sup ? (
          <sup className="ml-1 align-super text-xs font-normal text-muted-foreground">
            {sup}
          </sup>
        ) : null}
      </h2>
      {description ? (
        <div className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {description}
        </div>
      ) : null}
    </header>
  );
}

export function PanelContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-slot="panel-content" className={cn("px-4 py-6 sm:px-6", className)}>
      {children}
    </div>
  );
}

/** "Fig. 1." style caption, as used throughout the reference design. */
export function FigCaption({
  num,
  children,
  className,
}: {
  num?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground",
        className
      )}
    >
      {num ? <span className="text-foreground">Fig. {num}.</span> : null} {children}
    </p>
  );
}

/** Hatched band between two panels. */
export function Separator() {
  return <div aria-hidden className="stripe-divider w-full border-x" />;
}
