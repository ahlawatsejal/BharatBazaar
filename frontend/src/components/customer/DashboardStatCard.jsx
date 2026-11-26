export default function DashboardStatCard({ title, value, helper, icon, linkTo }) {
  return (
    <div
      className="p-5 bg-white border border-[#EBE4DA] rounded-sm flex items-start justify-between relative group hover:border-[var(--burgundy)] transition-colors"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brown-light)] mb-1">
          {title}
        </p>
        <p
          className="font-serif text-2xl font-bold text-[var(--brown-dark)] mb-1"
        >
          {value}
        </p>
        {helper && (
          <p className="text-[11.5px] text-[var(--brown-mid)]">
            {helper}
          </p>
        )}
      </div>

      <div className="w-10 h-10 rounded-sm bg-[#FAF6F2] flex items-center justify-center text-[var(--burgundy)] flex-shrink-0">
        {icon}
      </div>

      {linkTo && (
        <a href={linkTo} className="absolute inset-0 z-10" aria-label={`View ${title}`} />
      )}
    </div>
  );
}
