import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <main className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 shadow-lg">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Wannabe
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          App foundation is ready.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Next.js, TypeScript, Tailwind, and base UI primitives are scaffolded
          for Milestone 1 Task 1.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button>Start Building</Button>
          <Button variant="secondary">View Plan</Button>
        </div>
      </main>
    </div>
  );
}
