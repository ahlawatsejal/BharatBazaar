export default function AddressCard({ address, onEdit, onDelete, onSetDefault, isActionLoading }) {
  return (
    <div
      className={`relative p-5 rounded-sm border transition-all ${
        address.is_default
          ? 'border-[var(--burgundy)] bg-[#FDFBF9] shadow-sm'
          : 'border-[#EBE4DA] bg-white hover:border-[#D6CCC2]'
      }`}
    >
      {/* Default badge */}
      {address.is_default && (
        <span
          className="inline-block px-2 py-0.5 mb-2.5 text-[10px] font-bold uppercase tracking-wider rounded"
          style={{ background: '#F8E8EE', color: 'var(--burgundy)' }}
        >
          Default Shipping Address
        </span>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--brown-dark)', fontFamily: 'var(--font-serif)' }}
          >
            {address.full_name}
          </h3>
          <p className="text-xs text-[var(--brown-mid)] mt-0.5">
            {address.phone_number}
          </p>
        </div>
      </div>

      <div className="mt-3 text-xs leading-relaxed text-[var(--brown-mid)]">
        <p>{address.address_line_1}</p>
        {address.address_line_2 && <p>{address.address_line_2}</p>}
        <p>
          {address.city}, {address.state} — {address.postal_code}
        </p>
        <p>{address.country || 'India'}</p>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-[#F2ECE4] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(address)}
            className="font-medium text-[var(--brown-dark)] hover:text-[var(--burgundy)] transition-colors cursor-pointer"
          >
            Edit
          </button>
          <span className="text-[#D6CCC2]">•</span>
          <button
            type="button"
            onClick={() => onDelete(address.id)}
            disabled={isActionLoading}
            className="font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Delete
          </button>
        </div>

        {!address.is_default && onSetDefault && (
          <button
            type="button"
            onClick={() => onSetDefault(address.id)}
            disabled={isActionLoading}
            className="text-[11px] font-semibold text-[var(--burgundy)] hover:underline cursor-pointer disabled:opacity-50"
          >
            Set as Default
          </button>
        )}
      </div>
    </div>
  );
}
