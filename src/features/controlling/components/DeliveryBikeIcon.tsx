export function DeliveryBikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 14l2-5h4l3 5" />
      <path d="M12 9l3-4h3" />
      <rect x="3" y="6" width="5" height="4" rx="1" />
    </svg>
  );
}
