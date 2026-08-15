export function EmptyState() {
  return (
    <div className="h-36 m-3.5 border border-dashed border-white/13 rounded-[10px] flex flex-col items-center justify-center gap-3">
      <div className="text-[13.5px] text-text-muted">No campaigns yet.</div>
      <button className="flex items-center gap-1.75 bg-orange hover:bg-orange-hover text-[#120C06] text-[13px] font-semibold rounded-lg px-4 py-2.25 cursor-pointer transition-colors">
        <svg width="12" height="12" viewBox="0 0 14 14">
          <path
            d="M7 2v10M2 7h10"
            stroke="#120C06"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        Create your first campaign
      </button>
    </div>
  );
}
