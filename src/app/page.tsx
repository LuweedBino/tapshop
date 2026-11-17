import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import { getCreator } from "@/lib/auth";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });

const MARQUEE = [
  "Design Studio", "Video Editor", "Build My Video with AI", "B-roll Builder", "Auto captions", "Photo Lab",
  "Free music", "Sound effects", "Review showcase", "Media Vault", "Link-in-bio store", "Digital products",
  "Discount codes", "Email leads", "Portfolio", "Sell this",
];

type Tool = { icon: string; title: string; body: string; tags?: string[]; big?: boolean };

const CREATE: Tool[] = [
  {
    icon: "🎬", title: "Video Editor", big: true,
    body: "A full editor that fits in your pocket. 49 ready-made UGC templates, animated graphics packs, stickers, smooth zooms and a timeline that feels right on a phone.",
    tags: ["49 templates", "Graphics packs", "MP4 export", "Auto-save"],
  },
  {
    icon: "🪄", title: "Build My Video with AI",
    body: "Tell it what you're selling. It writes the script, gives you hooks to pick from, films you with a teleprompter and builds the video.",
  },
  {
    icon: "🎞️", title: "B-roll Builder",
    body: "Drop in your clips. AI sorts them into a story — hook, problem, solution, call to action — and cuts them to the beat.",
  },
  {
    icon: "✨", title: "Auto captions",
    body: "Captions that pop, made right in your browser. Styles, highlights, emoji, and they follow your voiceover.",
  },
  {
    icon: "🎵", title: "Free music & sound FX",
    body: "78+ music styles made for creators and 50 sound effects. No licences, no copyright strikes. Music dips when you talk.",
  },
  {
    icon: "🎨", title: "Design Studio", big: true,
    body: "Posts, stories, thumbnails and PDFs at every platform's size. Animated templates, your brand kit, shapes, stickers and multi-page designs.",
    tags: ["Instagram", "TikTok", "YouTube", "Pinterest", "PDF"],
  },
  {
    icon: "🖌️", title: "Photo Lab",
    body: "Layers, selections, retouching and filters. A real photo editor, no app to install.",
  },
  {
    icon: "⭐", title: "Review showcase",
    body: "Turn screenshots of real reviews into a scroll-stopping video in seconds. Made for affiliates.",
  },
  {
    icon: "🗄️", title: "Media Vault", big: true,
    body: "Every clip, design and project, saved in one private place and ready to use anywhere.",
  },
];

const SELL: Tool[] = [
  { icon: "🔗", title: "Your store, in your bio", body: "One link for Instagram, TikTok and YouTube that opens a storefront built for phones." },
  { icon: "💸", title: "Sell this", body: "Turn any video, design or file into a product with one tap — straight from the editor." },
  { icon: "🏷️", title: "Discount codes", body: "Percent or dollar off, one product or the whole store, with limits and end dates." },
  { icon: "📬", title: "Grow your email list", body: "Give a freebie for an email. Every lead lands in your dashboard, ready to export." },
  { icon: "💼", title: "Portfolio for brands", body: "A polished page that shows brands your best work, your numbers and how to book you." },
  { icon: "🏦", title: "Keep what you earn", body: "0% platform fees. Card, Apple Pay and Google Pay, paid out to your own Stripe account." },
];

const STEPS = [
  { n: "01", title: "Make it", body: "Film, design or let AI build it. Templates, captions and music are already there." },
  { n: "02", title: "Polish it", body: "Trim, add graphics, clean up the sound and add your brand. Everything saves on its own." },
  { n: "03", title: "Sell it", body: "Post it, put it in your store, or send it to a brand. Get paid straight to your account." },
];

const FOR = [
  { icon: "🎥", title: "UGC creators", body: "Make brand-ready videos fast, then show them off in a Portfolio that wins the next deal." },
  { icon: "🛍️", title: "Affiliate marketers", body: "Review videos, product showcases and a link-in-bio store that turns views into sales." },
  { icon: "🏢", title: "Brands", body: "Give your creators one place to make content that matches your look, every time." },
];

const STATS = [
  { v: "49", l: "UGC video templates" },
  { v: "78+", l: "Free music styles" },
  { v: "50", l: "Sound effects" },
  { v: "0%", l: "Platform fees" },
];

export default async function Home() {
  const creator = await getCreator();
  return (
    <div className="lp">
      <RevealOnScroll />

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-logo" aria-label="TapShop home">
            <span className="lp-logo-dot" aria-hidden />TapShop
          </Link>
          <nav className="lp-nav-links" aria-label="Sections">
            <a href="#create">Create</a>
            <a href="#sell">Sell</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="lp-nav-cta">
            {creator ? (
              <Link href="/dashboard" className="lp-btn lp-btn-light lp-btn-sm">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="lp-signin">Sign in</Link>
                <Link href="/signup" className="lp-btn lp-btn-light lp-btn-sm">Start free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-aurora" aria-hidden>
            <span /><span /><span />
          </div>
          <div className="lp-grid-bg" aria-hidden />
          <div className="lp-wrap lp-hero-in">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow lp-rise" style={{ "--d": "0ms" } as React.CSSProperties}>
                <span className="lp-pulse" aria-hidden /> For UGC creators, affiliates &amp; brands
              </p>
              <h1 className="lp-h1 lp-rise" style={{ "--d": "90ms" } as React.CSSProperties}>
                Create it. Edit it.
                <br />
                <em className={`${serif.className} lp-shine`}>Sell it.</em>
              </h1>
              <p className="lp-lead lp-rise" style={{ "--d": "180ms" } as React.CSSProperties}>
                TapShop is your whole creator studio and your store in one place. Make scroll-stopping videos and designs,
                then sell them from your link in bio — all from your phone.
              </p>
              <div className="lp-hero-ctas lp-rise" style={{ "--d": "270ms" } as React.CSSProperties}>
                <Link href={creator ? "/dashboard" : "/signup"} className="lp-btn lp-btn-light">
                  {creator ? "Open your dashboard" : "Start free"} <span aria-hidden>→</span>
                </Link>
                <a href="#create" className="lp-btn lp-btn-ghost">See everything inside</a>
              </div>
              <p className="lp-fine lp-rise" style={{ "--d": "360ms" } as React.CSSProperties}>
                No credit card · Works on phone, tablet &amp; computer
              </p>
            </div>

            <div className="lp-hero-art lp-rise" style={{ "--d": "200ms" } as React.CSSProperties} aria-hidden>
              <div className="lp-phone">
                <div className="lp-phone-notch" />
                <div className="lp-screen lp-screen-shots">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/landing/editor.webp" alt="" className="lp-shot lp-shot-a" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/landing/store.webp" alt="" className="lp-shot lp-shot-b" />
                </div>
              </div>
              <div className="lp-chip lp-chip-a"><span className="lp-chip-ic">💸</span><span><b>New sale</b><small>Workout plan · $19.00</small></span></div>
              <div className="lp-chip lp-chip-b"><span className="lp-chip-ic">✨</span><span><b>Captions ready</b><small>42 words · Pop style</small></span></div>
              <div className="lp-chip lp-chip-c"><span className="lp-chip-ic">📬</span><span><b>+1 new lead</b><small>from your freebie</small></span></div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="lp-marquee" aria-label="What's inside">
          <div className="lp-marquee-track">
            {[0, 1].map((k) => (
              <ul key={k} aria-hidden={k === 1}>
                {MARQUEE.map((m) => (
                  <li key={m}>{m}<span aria-hidden>✦</span></li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* Create */}
        <section id="create" className="lp-sec">
          <div className="lp-wrap">
            <div className="lp-head" data-reveal>
              <p className="lp-kicker">The Studio</p>
              <h2 className="lp-h2">Everything you need to <em className={serif.className}>create</em>.</h2>
              <p className="lp-sub">A design studio, a video editor, a photo editor and AI helpers — built in, working together, ready on any screen.</p>
            </div>
            <div className="lp-bento">
              {CREATE.map((t, i) => (
                <article key={t.title} className={`lp-card${t.big ? " lp-card-big" : ""}`} data-reveal style={{ "--d": `${(i % 3) * 80}ms` } as React.CSSProperties}>
                  <span className="lp-card-ic" aria-hidden>{t.icon}</span>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                  {t.tags && (
                    <ul className="lp-tags">
                      {t.tags.map((g) => <li key={g}>{g}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Sell */}
        <section id="sell" className="lp-sec lp-sec-light">
          <div className="lp-wrap">
            <div className="lp-head" data-reveal>
              <p className="lp-kicker">The Store</p>
              <h2 className="lp-h2">Then turn it into <em className={serif.className}>income</em>.</h2>
              <p className="lp-sub">Your link in bio becomes a store. Sell what you make, collect emails and land brand deals.</p>
            </div>
            <div className="lp-sell">
              {SELL.map((t, i) => (
                <article key={t.title} className="lp-sell-card" data-reveal style={{ "--d": `${(i % 3) * 80}ms` } as React.CSSProperties}>
                  <span className="lp-sell-ic" aria-hidden>{t.icon}</span>
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="lp-stats">
          <div className="lp-wrap">
            <div className="lp-stats-in">
            {STATS.map((s, i) => (
              <div key={s.l} className="lp-stat" data-reveal style={{ "--d": `${i * 80}ms` } as React.CSSProperties}>
                <span className={`${serif.className} lp-stat-v`}>{s.v}</span>
                <span className="lp-stat-l">{s.l}</span>
              </div>
            ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="lp-sec">
          <div className="lp-wrap">
            <div className="lp-head" data-reveal>
              <p className="lp-kicker">How it works</p>
              <h2 className="lp-h2">Three steps. <em className={serif.className}>One app.</em></h2>
            </div>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.n} className="lp-step" data-reveal style={{ "--d": `${i * 100}ms` } as React.CSSProperties}>
                  <span className="lp-step-n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who it's for */}
        <section className="lp-sec lp-sec-tight">
          <div className="lp-wrap">
            <div className="lp-head" data-reveal>
              <p className="lp-kicker">Who it&apos;s for</p>
              <h2 className="lp-h2">Built for people who <em className={serif.className}>make things sell</em>.</h2>
            </div>
            <div className="lp-for">
              {FOR.map((f, i) => (
                <article key={f.title} className="lp-for-card" data-reveal style={{ "--d": `${i * 100}ms` } as React.CSSProperties}>
                  <span className="lp-for-ic" aria-hidden>{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="lp-final">
          <div className="lp-wrap">
            <div className="lp-final-box" data-reveal>
              <div className="lp-aurora lp-aurora-soft" aria-hidden><span /><span /></div>
              <h2 className="lp-h2">Your studio and your store, <em className={`${serif.className} lp-shine`}>one tap away</em>.</h2>
              <p className="lp-sub">Start free today. Make your first video in minutes.</p>
              <Link href={creator ? "/dashboard" : "/signup"} className="lp-btn lp-btn-light">
                {creator ? "Open your dashboard" : "Create your free account"} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span className="lp-logo"><span className="lp-logo-dot" aria-hidden />TapShop</span>
          <nav aria-label="Footer">
            <a href="#create">Create</a>
            <a href="#sell">Sell</a>
            <a href="#how">How it works</a>
            {creator ? <Link href="/dashboard">Dashboard</Link> : <Link href="/login">Sign in</Link>}
          </nav>
          <small>© {new Date().getFullYear()} TapShop</small>
        </div>
      </footer>
    </div>
  );
}
