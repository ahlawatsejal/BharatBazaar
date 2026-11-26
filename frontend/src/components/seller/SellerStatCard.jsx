export default function SellerStatCard({ title, value, subtext, icon, highlightColor = '#C0522B' }) {
  return (
    <div className="p-5 rounded-sm bg-white border border-[#E8DED2] shadow-xs hover:border-[#D6CCC2] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-[#7A5C4A] uppercase tracking-wider block">
            {title}
          </span>
          <p
            className="text-2xl font-bold text-[#2C2C2C] mt-1.5"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
          >
            {value}
          </p>
          {subtext && (
            <p className="text-[11px] text-[#8C7665] mt-1">
              {subtext}
            </p>
          )}
        </div>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: '#FFF8F0', color: highlightColor, border: '1px solid #F0DFCE' }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
