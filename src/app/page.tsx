import Link from "next/link";
import { Bot, Globe2, Layers3, Mic, SquarePen } from "lucide-react";
import HouseA from "@/components/svg/HouseA";
import HouseB from "@/components/svg/HouseB";
import HouseC from "@/components/svg/HouseC";

export default function LandingPage() {
  return (
    <main className="min-h-screen w-full bg-base-200 text-base-content">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-20 px-6 py-20 lg:px-10">
        <section className="flex min-h-screen w-full flex-col items-center justify-center gap-8 text-center">
          <p className="text-primary/80 text-sm uppercase tracking-widest">
            Talk With Buscalo
          </p>
          <div className="flex w-full max-w-4xl items-end justify-center gap-6">
            <div className="flex justify-center [animation:houseA-cycle_12s_linear_infinite]">
              <HouseA />
            </div>
            <div className="flex justify-center [animation:houseB-cycle_12s_linear_infinite]">
              <HouseB />
            </div>
            <div className="flex justify-center [animation:houseC-cycle_12s_linear_infinite]">
              <HouseC />
            </div>
          </div>

          <h1 className="font-bold text-4xl leading-tight sm:text-5xl">
            Real rentals, real-time research, in your own words.
          </h1>
          <p className="mx-auto max-w-2xl text-lg opacity-80">
            Ask Buscalo out loud to hunt for budget-friendly apartments, apply
            filters, and export listings with screenshots and CSVs. It thinks
            and clicks like a human, powered by Browserbase + Stagehand
            automation.
          </p>
          <div className="flex justify-center">
            <Link href="/studio" className="btn btn-primary btn-wide">
              Launch Buscalo Studio
            </Link>
          </div>
        </section>

        <section className="grid gap-12 rounded-3xl border border-base-300 bg-base-100 p-10 shadow-sm lg:grid-cols-2 lg:p-14">
          <article className="flex flex-col gap-5 text-left">
            <span className="badge badge-outline badge-primary w-fit">The Problem</span>
            <h2 className="text-3xl font-semibold lg:text-4xl">Modern rental search is fragmented</h2>
            <p className="text-base text-base-content/80 leading-relaxed">
              Listings live behind JavaScript-heavy maps, filters are buried in modal drawers,
              and exportable results are rare. Researchers and renters end up juggling
              spreadsheets, screenshots, and gut feel. Buscalo reframes the hunt as a
              conversation so you can brief one agent and get back real entries from real pages.
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-base-content/70">
              <li>Noisy portals make it hard to compare neighborhoods fast.</li>
              <li>Manual navigation burns time when applying price, bed, and pet filters.</li>
              <li>Infinite-scroll grids rarely expose CSV or visual audit trails.</li>
            </ul>
          </article>

          <article className="flex flex-col gap-5 text-left">
            <span className="badge badge-outline badge-secondary w-fit">The Solution</span>
            <h2 className="text-3xl font-semibold lg:text-4xl">Voice-first browser automation</h2>
            <p className="text-base text-base-content/80 leading-relaxed">
              Buscalo pairs a GPT-5 powered agent with Browserbase Stagehand to act inside a
              real browser session. It applies filters, scrolls listings, captures screenshots,
              and stores structured data in Convex for live updates. You get a research teammate
              that explains every step and hands you exports within minutes.
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-base-content/70">
              <li>Talk or tap-to-speak instructions, no rigid forms required.</li>
              <li>Infinite-scroll handling with deduped cards and geo heat maps.</li>
              <li>Artifacts, CSV, and JSON downloads for audit-ready sharing.</li>
            </ul>
          </article>
        </section>

        <section className="grid gap-6 rounded-3xl bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 p-10 shadow-sm lg:grid-cols-3 lg:p-14">
          <div className="flex flex-col gap-4 rounded-2xl bg-base-100/80 p-6 shadow">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/10 p-3 text-primary">
                <Layers3 className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-semibold">Next.js + Convex</h3>
            </div>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Full-stack reactivity keeps the studio UI in sync with long-running agent jobs.
              Convex stores sessions, job state, artifacts, and streaming execution logs.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl bg-base-100/80 p-6 shadow">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-secondary/10 p-3 text-secondary">
                <Globe2 className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-semibold">Stagehand + Browserbase</h3>
            </div>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Browser-native automation drives JS-heavy map UIs, applies filters, scrolls lists,
              and extracts schema-validated listings without brittle selectors.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl bg-base-100/80 p-6 shadow">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-accent/10 p-3 text-accent">
                <Bot className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-semibold">GPT-5 Agent Orchestration</h3>
            </div>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Multi-tool reasoning selects actions—from natural language planning to Playwright
              commands—while logging each step for transparency and replayability.
            </p>
          </div>
        </section>

        <section className="grid gap-10 rounded-3xl border border-base-300 bg-base-100 p-10 shadow-sm lg:grid-cols-[1.1fr_1fr] lg:p-14">
          <div className="flex flex-col gap-6">
            <span className="badge badge-outline w-fit">Agent Playbook</span>
            <h2 className="text-3xl font-semibold">How Buscalo finds and curates rentals</h2>
            <div className="rounded-2xl bg-base-200/60 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-primary/20 p-3 text-primary">
                  <Mic className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">Find Rentals Flow</h3>
                  <p className="text-sm text-base-content/70">
                    Voice briefs like “Jersey City studios under $2,000 with pets” kick off a
                    Browserbase session. The agent navigates, applies filters, scrolls, and pulls
                    rich listing cards with lat/lng when available.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-base-200/60 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-secondary/20 p-3 text-secondary">
                  <SquarePen className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">Display & Export Flow</h3>
                  <p className="text-sm text-base-content/70">
                    Live listings stream into the control room, where heat overlays, tables, CSV,
                    and JSON exports help you vet neighborhoods and share findings instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-2xl bg-base-200/60 p-6 lg:p-10">
            <h3 className="text-xl font-semibold">What you see in the Studio</h3>
            <ul className="space-y-4 text-sm text-base-content/70">
              <li>
                <strong className="text-base-content">Live agent log:</strong> status badges,
                screenshots, and retries streamed from Convex.
              </li>
              <li>
                <strong className="text-base-content">Live listings table:</strong> sortable cards
                update as the agent scrapes fresh results from the target site.
              </li>
              <li>
                <strong className="text-base-content">Audit-ready exports:</strong> CSV/JSON links
                and supporting screenshots for every run.
              </li>
              <li>
                <strong className="text-base-content">Fallback demo mode:</strong> if a target site
                resists automation, a demo map showcases the workflow.
              </li>
            </ul>
            <Link href="/studio" className="btn btn-primary mt-auto self-start">
              Try the Studio walkthrough
            </Link>
          </div>
        </section>

        <footer className="text-center text-sm opacity-70">
          Ready to brief the agent?&nbsp;
          <Link href="/studio" className="link link-primary">
            Open the studio workspace
          </Link>
          .
        </footer>
      </div>
    </main>
  );
}
