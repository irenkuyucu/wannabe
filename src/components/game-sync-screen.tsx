export function GameSyncScreen() {
  return (
    <section aria-label="Loading game phase" className="game-screen game-sync">
      <div className="game-screen-shell surface-enter">
        <div aria-hidden="true" className="game-meta game-sync-meta">
          <div className="game-meta-row game-sync-meta-row">
            <div className="game-sync-meta-skeleton skeleton-ghost" />
            <div className="game-sync-phase-skeleton skeleton-ghost" />
          </div>
          <div className="game-timer-row game-sync-timer-row">
            <div className="progress-track game-sync-progress skeleton-ghost" />
            <div className="game-sync-timer-skeleton skeleton-ghost" />
          </div>
        </div>

        <div aria-hidden="true" className="game-sync-body">
          <div className="game-sync-title skeleton-ghost" />
          <div className="game-sync-helper skeleton-ghost" />

          <div className="game-sync-stage">
            <div className="game-sync-card skeleton-ghost" />
            <div className="game-sync-floating-avatar skeleton-ghost" />
          </div>

          <div className="game-sync-button skeleton-ghost" />
        </div>
      </div>
    </section>
  );
}
