import { Link, useLocation } from 'react-router-dom';
import { useT } from '@/i18n';

const icons = {
  today: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="17" rx="4" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  week: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  ),
  sprint: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
  review: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  ),
} as const;

const tabs = [
  { path: '/', label: 'tabToday', icon: icons.today },
  { path: '/week', label: 'tabWeek', icon: icons.week },
  { path: '/sprint', label: 'tabSprint', icon: icons.sprint },
  { path: '/review', label: 'tabReview', icon: icons.review },
] as const;

export function TabBar() {
  const { t } = useT();
  const location = useLocation();

  return (
    <nav className="tab-bar">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`tab-item ${isActive ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{t(tab.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
