/** Three blurred, slowly drifting orbs behind everything. Decorative only.
 * Dimmed inside the app (see `.app-shell` in globals.css) so colour never
 * competes with data. No JavaScript needed. */
export function BackdropOrbs() {
  return (
    <div className="backdrop-orbs" aria-hidden>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}
