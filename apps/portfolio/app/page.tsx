import { SiteHeader } from "@/components/site-header";
import { ProfileHeader } from "@/components/profile-header";
import { Overview } from "@/components/overview";
import { SocialLinks } from "@/components/social-links";
import { GitHubContributions } from "@/components/github-contributions";
import { Hello } from "@/components/hello";
import { TechStack } from "@/components/tech-stack";
import { Experiences } from "@/components/experiences";
import { Projects } from "@/components/projects";
import { Writing } from "@/components/writing";
import { Contact } from "@/components/contact";
import { Panel, Separator } from "@/components/panel";

export default function PortfolioPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <Panel>
          <ProfileHeader />
        </Panel>
        <Separator />

        <Overview />
        <SocialLinks />

        <Panel>
          <div className="screen-line-top px-4 py-6 sm:px-6">
            <p className="panel-label">GitHub contributions</p>
            <div className="mt-4">
              <GitHubContributions />
            </div>
          </div>
        </Panel>
        <Separator />

        <Hello />
        <Separator />

        <TechStack />
        <Separator />

        <Experiences />
        <Separator />

        <Projects />
        <Separator />

        <Writing />
        <Separator />

        <Contact />
      </main>

      <footer className="screen-line-top border-x px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-label text-muted-foreground">
          <span>© {new Date().getFullYear()} Mohammad Omar</span>
          <span className="normal-case tracking-normal">
            Next.js · Tailwind CSS · design language after{" "}
            <a href="https://chanhdai.com" className="hover:underline">
              chanhdai.com
            </a>
          </span>
          <a href="#top" className="hover:text-foreground">
            Back to top ↑
          </a>
        </div>
      </footer>
    </>
  );
}
