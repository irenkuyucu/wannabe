export function EntryAvatar() {
  return (
    <div aria-hidden="true" className="entry-avatar-scene">
      <div className="entry-avatar-backdrop" />
      <div className="entry-avatar-torso" />
      <div className="entry-avatar-neck" />
      <div className="entry-avatar-head">
        <div className="entry-avatar-hair" />
        <div className="entry-avatar-fringe" />
        <div className="entry-avatar-ear entry-avatar-ear-left" />
        <div className="entry-avatar-ear entry-avatar-ear-right" />
        <div className="entry-avatar-eye entry-avatar-eye-left" />
        <div className="entry-avatar-eye entry-avatar-eye-right" />
        <div className="entry-avatar-brow entry-avatar-brow-left" />
        <div className="entry-avatar-brow entry-avatar-brow-right" />
        <div className="entry-avatar-nose" />
        <div className="entry-avatar-smile" />
      </div>
    </div>
  );
}
