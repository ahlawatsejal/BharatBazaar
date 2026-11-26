const STAGES = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Workshop Processing' },
  { key: 'SHIPPED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function OrderStatusTimeline({ currentStatus }) {
  const isCancelled = currentStatus === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-800 flex items-center gap-2">
        <span className="font-bold">✕ Order Cancelled:</span>
        <span>This order was cancelled and any applicable refunds have been processed.</span>
      </div>
    );
  }

  // Find index of current stage
  const currentIndex = STAGES.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentIndex !== -1 ? currentIndex : 1; // Default to confirmed

  return (
    <div className="py-4" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="flex items-center justify-between relative">
        {/* Progress bar background line */}
        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-[#EBE4DA] -z-0" />
        {/* Filled active line */}
        <div
          className="absolute top-3.5 left-4 h-0.5 bg-[var(--burgundy)] -z-0 transition-all duration-500"
          style={{ width: `${(activeIdx / (STAGES.length - 1)) * 92}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isDone = idx <= activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <div key={stage.key} className="flex flex-col items-center text-center z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-[var(--burgundy)] text-white shadow-xs'
                    : 'bg-white border-2 border-[#D6CCC2] text-[var(--brown-light)]'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium max-w-[70px] leading-tight ${
                  isCurrent
                    ? 'text-[var(--burgundy)] font-bold'
                    : isDone
                    ? 'text-[var(--brown-dark)]'
                    : 'text-[var(--brown-light)]'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
