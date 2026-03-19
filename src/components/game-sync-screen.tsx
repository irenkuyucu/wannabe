export function GameSyncScreen() {
  return (
    <section aria-label="Loading game phase" className="game-sync-screen">
      <div className="game-sync-screen-shell toy-float">
        <div aria-hidden="true" className="game-sync-screen-header">
          <div className="game-sync-screen-meta-row">
            <div className="game-sync-screen-meta-skeleton skeleton-block" />
            <div className="game-sync-screen-meta-skeleton skeleton-block" />
          </div>
          <div className="game-sync-screen-progress skeleton-block" />
        </div>
        <div aria-hidden="true" className="game-sync-screen-body">
          <div className="game-sync-screen-title skeleton-block" />
          <div className="game-sync-screen-helper skeleton-block" />
          <div className="game-sync-screen-card skeleton-block" />
        </div>
      </div>
    </section>
  );
}
