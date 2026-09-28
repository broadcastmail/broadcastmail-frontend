export function NoSchemaView() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
        We couldn&apos;t read your database
      </h1>
      <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A]">
        Schema detection failed to return a result. Try reconnecting your
        Supabase project.
      </p>
    </div>
  );
}
