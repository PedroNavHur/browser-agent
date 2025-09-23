import HouseA from "@/components/svg/HouseA";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen w-full bg-base-200 text-base-content">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-20 px-6 py-20 lg:px-10">
        <section className="flex min-h-screen w-full flex-col items-center justify-center gap-8 text-center">
          <p className="text-primary/80 text-sm uppercase tracking-widest">
            Talk With Buscalo
          </p>
          <div className="flex w-full max-w-4xl items-end justify-center gap-6">
            {[
              { src: "/img/houseA.svg", alt: "House A" },
              { src: "/img/houseB.svg", alt: "House B" },
              { src: "/img/houseC.svg", alt: "House C" },
            ].map(house => (
              <Image
                key={house.src}
                src={house.src}
                alt={house.alt}
                width={360}
                height={360}
                priority
                className="h-auto w-full max-w-[260px]"
              />
            ))}
          </div>
          <HouseA />
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

        <section className="grid min-h-screen items-start gap-12 lg:grid-cols-2">
          <article className="card bg-base-100 shadow-sm lg:rounded-3xl">
            <div className="card-body gap-5 text-left">
              <h2 className="card-title text-2xl">The Problem</h2>
              <p className="text-base text-base-content/80 leading-relaxed">
                Everybody knows how hard it is to find a good, affordable
                apartment today. Marketplace sites are noisy, stale, and feel
                detached from the actual streets. What if you could brief an
                agent, speak to it naturally, and have it do the hunt for you in
                the real browser?
              </p>
            </div>
          </article>

          <article className="card bg-base-100 shadow-sm lg:rounded-3xl">
            <div className="card-body gap-5 text-left">
              <h2 className="card-title text-2xl">Our Solution</h2>
              <p className="text-base text-base-content/80 leading-relaxed">
                Buscalo rides on Browserbase + Stagehand to browse listing sites
                like a human does: open filters, scroll the map, capture
                screenshots, and export structured data. Every session searches
                in real time—no stale datasets—while letting you drive the
                interaction with voice or text.
              </p>
            </div>
          </article>
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
