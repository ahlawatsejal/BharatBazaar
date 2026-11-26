import { Link } from 'react-router-dom';
import SellerLayout from '../../components/seller/SellerLayout';

export default function SellerPlaceholderPage({
  moduleName,
  stepTag = 'Step 8.2+',
  description,
  features = [],
}) {
  return (
    <SellerLayout
      title={moduleName}
      subtitle={`Artisan workspace module scheduled for implementation in ${stepTag}.`}
    >
      <div className="max-w-3xl p-8 rounded-sm bg-white border border-[#E8DED2] shadow-xs text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#FFF8F0', border: '1px solid #E8DED2' }}
        >
          <span className="text-2xl">🛠️</span>
        </div>

        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block mb-2"
          style={{ background: '#FFF8F0', color: '#C0522B', border: '1px solid #F0DFCE' }}
        >
          {stepTag} Module
        </span>

        <h2
          className="text-xl font-bold text-[#2C2C2C] mb-2"
          style={{ fontFamily: 'var(--font-serif, "Playfair Display", serif)' }}
        >
          {moduleName} Foundation Initialized
        </h2>

        <p className="text-xs text-[#7A5C4A] max-w-lg mx-auto leading-relaxed mb-6">
          {description ||
            `This module is part of the upcoming milestone. The foundational navigation, route security, and backend permissions are in place.`}
        </p>

        {features.length > 0 && (
          <div className="text-left bg-[#FAF7F2] p-5 rounded-sm border border-[#E8DED2] max-w-md mx-auto mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C2C2C] block mb-2">
              Upcoming Capabilities:
            </span>
            <ul className="text-xs space-y-1.5 text-[#4A3728] list-disc pl-4">
              {features.map((feat, i) => (
                <li key={i}>{feat}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/seller/dashboard"
            className="px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-white transition-opacity"
            style={{ background: '#C0522B' }}
          >
            ← Return to Overview
          </Link>
          <Link
            to="/seller/store"
            className="px-4 py-2 rounded-sm text-xs font-semibold text-[#4A3728] border border-[#D6CCC2] hover:bg-[#FAF7F2]"
          >
            Storefront Settings
          </Link>
        </div>
      </div>
    </SellerLayout>
  );
}
