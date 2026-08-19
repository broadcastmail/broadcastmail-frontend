import { Spinner } from "@/components/onboarding/spinner";

// Root-level fallback — shown while "/" resolves getMe(), and anywhere else
// under app/ that doesn't define a more specific loading.tsx (e.g.
// app/onboarding/* has its own, which wins there).
export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={16} className="border-[#26262F] border-t-orange" />
    </div>
  );
}
