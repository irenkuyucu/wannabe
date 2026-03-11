import { Button } from "@/components/ui/button";

const principles = [
  {
    title: "Toy-like surfaces",
    description:
      "Buttons, panels, and timers should feel molded and stackable, not flat or editorial.",
    tone: "from-[#2ef0ff] to-[#5ea4ff]",
  },
  {
    title: "Arcade color logic",
    description:
      "Blue is the stage, lime and magenta are action accents, and yellow marks points and wins.",
    tone: "from-[#ff59d8] to-[#b95bff]",
  },
  {
    title: "Big-state hierarchy",
    description:
      "Room code, countdowns, phase banners, and score changes need the visual weight of game HUD elements.",
    tone: "from-[#ffe55f] to-[#ff9d2e]",
  },
];

const lobbyPlayers = [
  { name: "Iris", tag: "HOST", color: "bg-[#ffe04d] text-[#7a4200]" },
  { name: "Mert", tag: "READY", color: "bg-[#62f15a] text-[#0d581a]" },
  { name: "Selin", tag: "READY", color: "bg-[#62f15a] text-[#0d581a]" },
  { name: "Deniz", tag: "PICKING", color: "bg-[#ff82ea] text-[#6d1676]" },
];

const sideCards = [
  {
    side: "Side A",
    title: "Astronaut",
    copy: "Clean, elite, convincing.",
    style:
      "border-[#2ddff8] bg-linear-to-b from-[#56dcff] to-[#3f8fff] text-white shadow-[0_8px_0_#176dc9]",
  },
  {
    side: "Side B",
    title: "Pirate",
    copy: "Chaotic, flashy, impossible to ignore.",
    style:
      "border-[#ff74e6] bg-linear-to-b from-[#ff79d3] to-[#b555ff] text-white shadow-[0_8px_0_#7f26c2]",
  },
];

const resolutionRows = [
  { label: "Astronaut crew", points: "+2", color: "text-[#ffd84c]" },
  { label: "Pirate crew", points: "+1", color: "text-[#7eff85]" },
  { label: "Dissenter hit", points: "-20s", color: "text-[#ff8bef]" },
];

export default function Home() {
  return (
    <main className="toy-page min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:gap-6">
        <section className="toy-shell overflow-hidden rounded-[2rem] px-5 py-5 sm:px-7 sm:py-7">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="toy-float">
              <div className="flex flex-wrap items-center gap-3">
                <span className="hud-pill bg-[#0c47a9] text-white">
                  Milestone 4 / Task 1
                </span>
                <span className="hud-pill bg-[#ff73df] text-[#621263]">
                  second art pass
                </span>
              </div>
              <h1 className="mt-5 max-w-3xl text-balance text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] text-white drop-shadow-[0_4px_0_rgba(11,49,116,0.95)] sm:text-6xl lg:text-7xl">
                Wannabe should feel closer to a toy box than a product page.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[#d8ecff] sm:text-xl">
                This pass pushes the MVP toward bright arcade energy: blue stage
                backgrounds, chunky control surfaces, stronger HUD treatment,
                and sample screens that read like a game first.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg">Create room</Button>
                <Button size="lg" variant="secondary">
                  Join with code
                </Button>
              </div>
              <div className="mt-7 grid gap-3 md:grid-cols-3">
                {principles.map((principle) => (
                  <article
                    className="toy-chip-panel rounded-[1.6rem] p-4"
                    key={principle.title}
                  >
                    <span
                      className={`inline-flex rounded-full bg-linear-to-r px-3 py-1 text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#0d2459] ${principle.tone}`}
                    >
                      locked
                    </span>
                    <h2 className="mt-3 text-lg font-black uppercase tracking-[0.01em] text-white">
                      {principle.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#d8ecff]">
                      {principle.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <section className="toy-phone-frame toy-float rounded-[2.25rem] p-3 sm:p-4">
              <div className="toy-phone-notch mx-auto h-7 w-36 rounded-b-[1.1rem]" />
              <div className="toy-screen relative mt-3 overflow-hidden rounded-[1.8rem] px-4 py-5 sm:px-5">
                <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_60%)]" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="hud-bubble size-12 rounded-[1.1rem] bg-linear-to-b from-white to-[#dce8ff] text-2xl">
                      Z
                    </div>
                    <div className="score-pill min-w-0 flex-1 justify-center">
                      <span className="text-[#9ad9ff]">ROOM</span>
                      <span className="ml-2 text-white">482901</span>
                    </div>
                    <div className="hud-bubble size-12 rounded-[1.1rem] bg-linear-to-b from-[#8dff5b] to-[#39d629] text-xl">
                      +
                    </div>
                  </div>

                  <div className="mt-8 text-center">
                    <div className="mx-auto max-w-fit rounded-[1.25rem] border-[3px] border-[#ffd53b] bg-linear-to-b from-[#ffe86b] to-[#ffb020] px-6 py-3 shadow-[0_8px_0_#db8406]">
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-[#6e2d00]">
                        Party game companion
                      </p>
                    </div>
                    <p className="mt-6 text-5xl font-black uppercase tracking-[-0.04em] text-white drop-shadow-[0_4px_0_rgba(11,49,116,0.95)]">
                      Wannabe
                    </p>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#dff0ff]">
                      Fast room creation, loud phase states, and no dead-air UI.
                    </p>
                  </div>

                  <div className="mt-8 rounded-[1.8rem] bg-[#0a3f96]/75 px-4 py-4 ring-1 ring-white/10">
                    <div className="rounded-[1.4rem] border-[3px] border-white/70 bg-white px-4 py-4 text-center shadow-[0_8px_0_#bdd2f3]">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6c86a7]">
                        Display name
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#14336c]">
                        Captain Maybe
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Button className="w-full" size="lg">
                        Create
                      </Button>
                      <Button className="w-full" size="lg" variant="secondary">
                        Join
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <article className="toy-shell rounded-[2rem] px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="section-banner bg-linear-to-r from-[#ffe761] to-[#ffba30] text-[#7a3b00]">
                Lobby
              </p>
              <span className="hud-pill bg-[#0b4db5] text-white">Room 482901</span>
            </div>
            <div className="mt-5 space-y-3">
              {lobbyPlayers.map((player) => (
                <div
                  className="toy-list-row flex items-center justify-between gap-3 rounded-[1.4rem] px-4 py-3"
                  key={player.name}
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar-orb size-12 rounded-full bg-linear-to-b from-[#54e2ff] to-[#358dff]" />
                    <div>
                      <p className="text-lg font-black uppercase text-white">
                        {player.name}
                      </p>
                      <p className="text-sm text-[#d9eeff]">
                        {player.tag === "PICKING"
                          ? "Still choosing a sidekick."
                          : "Ready for the next round."}
                      </p>
                    </div>
                  </div>
                  <span className={`hud-pill ${player.color}`}>{player.tag}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.6rem] bg-[#082f76] px-4 py-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-white">
                  Start gate
                </p>
                <p className="score-pill !px-3 !py-1">3 / 4 ready</p>
              </div>
              <div className="progress-track mt-3 h-4 rounded-full">
                <span className="progress-fill rounded-full" style={{ width: "75%" }} />
              </div>
            </div>
          </article>

          <article className="toy-shell rounded-[2rem] px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="section-banner bg-linear-to-r from-[#53ecff] to-[#4b8cff] text-[#11386d]">
                Choice
              </p>
              <span className="score-pill">
                <span className="text-[#9ad9ff]">TIME</span>
                <span className="ml-2 text-white">00:43</span>
              </span>
            </div>
            <div className="progress-track mt-5 h-4 rounded-full">
              <span className="progress-fill rounded-full" style={{ width: "68%" }} />
            </div>
            <div className="mt-5 rounded-[1.75rem] border-[3px] border-white/70 bg-white px-4 py-5 text-center shadow-[0_8px_0_#bdd2f3]">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6c86a7]">
                Would you rather be
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-[1.02] tracking-[-0.04em] text-[#10356f]">
                Astronaut
                <br />
                or Pirate?
              </h2>
            </div>
            <div className="mt-4 space-y-4">
              {sideCards.map((card) => (
                <button
                  className={`w-full rounded-[1.8rem] border-[3px] px-4 py-4 text-left ${card.style}`}
                  key={card.title}
                  type="button"
                >
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/80">
                    {card.side}
                  </p>
                  <p className="mt-2 text-2xl font-black uppercase tracking-[-0.03em]">
                    {card.title}
                  </p>
                  <p className="mt-1 text-sm text-white/82">{card.copy}</p>
                </button>
              ))}
            </div>
          </article>

          <article className="toy-shell rounded-[2rem] px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="section-banner bg-linear-to-r from-[#8cff56] to-[#36d51d] text-[#114f1c]">
                Resolution
              </p>
              <Button>Next round</Button>
            </div>
            <div className="toy-stage mt-5 rounded-[1.9rem] px-5 py-5 text-center">
              <div className="mx-auto max-w-fit rounded-[1.2rem] border-[3px] border-[#ffe26a] bg-linear-to-b from-[#fff38a] to-[#ffcb2f] px-4 py-2 shadow-[0_7px_0_#da9706]">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-[#703200]">
                  Round winner
                </p>
              </div>
              <p className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] text-white drop-shadow-[0_4px_0_rgba(11,49,116,0.95)]">
                Astronauts
              </p>
              <p className="mt-2 text-sm leading-6 text-[#dff0ff]">
                Big result state, compact score deltas, and one obvious host action.
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {resolutionRows.map((row) => (
                <div
                  className="toy-list-row flex items-center justify-between gap-3 rounded-[1.4rem] px-4 py-3"
                  key={row.label}
                >
                  <div>
                    <p className="text-lg font-black uppercase text-white">
                      {row.label}
                    </p>
                    <p className="text-sm text-[#d9eeff]">
                      Inline delta keeps the scoreboard readable.
                    </p>
                  </div>
                  <span className={`text-3xl font-black uppercase ${row.color}`}>
                    {row.points}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="toy-shell rounded-[2rem] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#bfe1ff]">
                Component direction
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] text-white">
                Reusable parts should act like HUD pieces
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="section-banner bg-linear-to-r from-[#ff75e3] to-[#b35dff] text-white">
                beveled buttons
              </span>
              <span className="section-banner bg-linear-to-r from-[#58efff] to-[#4d8cff] text-[#14356b]">
                glossy chips
              </span>
              <span className="section-banner bg-linear-to-r from-[#90ff67] to-[#35d91a] text-[#124f1e]">
                loud timers
              </span>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="toy-chip-panel rounded-[1.7rem] px-4 py-4">
              <div className="score-pill max-w-fit">HUD badge</div>
              <p className="mt-4 text-xl font-black uppercase text-white">
                Phase labels and room metadata should read like collectible game chips.
              </p>
            </div>
            <div className="toy-chip-panel rounded-[1.7rem] px-4 py-4">
              <div className="progress-track h-4 rounded-full">
                <span className="progress-fill rounded-full" style={{ width: "82%" }} />
              </div>
              <p className="mt-4 text-xl font-black uppercase text-white">
                Countdown UI should be a real visual object, not a subtle bar tucked away.
              </p>
            </div>
            <div className="toy-chip-panel rounded-[1.7rem] px-4 py-4">
              <div className="flex gap-3">
                <Button>Ready</Button>
                <Button variant="secondary">Share</Button>
              </div>
              <p className="mt-4 text-xl font-black uppercase text-white">
                Actions should feel pressable and physical enough to guide group play.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
