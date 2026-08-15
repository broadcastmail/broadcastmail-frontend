import { SignInButton } from "./sign-in-button";

export function LandingContent() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-[32px] font-semibold text-text-primary tracking-[-0.02em]">
        BroadcastMail
      </h1>
      <p className="text-[15px] text-text-muted max-w-md">
        Send emails to your Supabase users within seconds.
      </p>
      <SignInButton />
    </div>
  );
}
