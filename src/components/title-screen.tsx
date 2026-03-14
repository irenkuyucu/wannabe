import { bangers } from "@/app/fonts";

type TitleScreenProps = {
  progress: number;
};

export function TitleScreen({ progress }: TitleScreenProps) {
  const progressValue = Math.round(progress * 100);

  return (
    <main className="title-splash" role="presentation">
      <div className="title-splash-stack">
        <h1
          className={`${bangers.className} title-splash-logo`}
          style={bangers.style}
        >
          Wannabe!
        </h1>
        <div
          aria-label="Loading game"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressValue}
          className="title-splash-progress"
          role="progressbar"
        >
          <div
            className="title-splash-progress-fill"
            style={{
              transform: `scaleX(${Math.min(Math.max(progress, 0.02), 1)})`,
            }}
          />
        </div>
      </div>

      <p className="title-splash-copyright">© 2026 Iren Can Kuyucu</p>
    </main>
  );
}
