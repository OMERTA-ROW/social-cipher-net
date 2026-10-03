import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Honest holding page for documents the site owner has not published yet.
 * Never fill this with invented legal or contact text.
 */
const COPY = {
  privacy: { title: "Privacy Policy", body: "The Cyber Link privacy policy has not been published yet." },
  terms: { title: "Terms of Service", body: "The Cyber Link terms of service have not been published yet." },
  contact: { title: "Contact", body: "Public contact details for Cyber Link have not been published yet." },
} as const;

const PendingPolicy = ({ kind }: { kind: keyof typeof COPY }) => {
  const c = COPY[kind];
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-primary/30 bg-card/80 p-6 text-center backdrop-blur">
        <h1 className="text-2xl font-semibold text-foreground">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.body} Until then, these existing pages describe how the platform handles accounts and content:</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/security">Privacy & security settings</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/community-guidelines">Community guidelines</Link></Button>
          <Button asChild size="sm"><Link to="/">Home</Link></Button>
        </div>
      </div>
    </main>
  );
};

export default PendingPolicy;
