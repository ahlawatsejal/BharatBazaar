export default function NotificationItem({ notification, onMarkRead }) {
  const getIcon = (type) => {
    switch (type) {
      case 'ORDER_UPDATE':
      case 'SHIPMENT':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      case 'PAYMENT':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'PROMOTION':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-[#F2ECE4] text-[var(--brown-dark)] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  const formattedDate = notification.created_at
    ? new Date(notification.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      className={`p-4 rounded-sm border transition-all flex items-start gap-3.5 ${
        notification.is_read
          ? 'bg-white border-[#EBE4DA]'
          : 'bg-[#FCFAF7] border-[#D6CCC2] shadow-xs'
      }`}
    >
      {getIcon(notification.notification_type)}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h4
            className={`text-xs font-semibold ${
              notification.is_read ? 'text-[var(--brown-dark)]' : 'text-[var(--burgundy)]'
            }`}
          >
            {notification.title}
          </h4>
          <span className="text-[11px] text-[var(--brown-light)] shrink-0">
            {formattedDate}
          </span>
        </div>
        <p className="text-xs text-[var(--brown-mid)] mt-1 leading-relaxed">
          {notification.message}
        </p>
      </div>

      {!notification.is_read && onMarkRead && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          title="Mark as read"
          className="text-[11px] font-semibold text-[var(--burgundy)] hover:underline shrink-0 cursor-pointer self-center"
        >
          Mark read
        </button>
      )}
    </div>
  );
}
