/** Header and width for the about, help and legal pages. */
export function TextPage({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {intro ? <p className="mt-3 text-lg text-muted">{intro}</p> : null}
        {updated ? <p className="mt-2 text-sm text-muted">Last updated {updated}</p> : null}
      </header>
      <div className="prose-page mt-6">{children}</div>
    </div>
  );
}
