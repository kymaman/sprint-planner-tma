import { Link, useLocation } from 'react-router-dom';
import { useT } from '@/i18n';

const tabs = [
  { path: '/', label: 'tabToday', icon: '📅' },
  { path: '/week', label: 'tabWeek', icon: '📊' },
  { path: '/sprint', label: 'tabSprint', icon: '🎯' },
  { path: '/review', label: 'tabReview', icon: '📝' },
] as const;

export function TabBar() {
  const { t } = useT();
  const location = useLocation();

  return (
    <div className="tab-bar">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path;

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`tab-item ${isActive ? 'active' : ''}`}
          >
            <div className="tab-icon" style={{ fontSize: '24px' }}>
              {tab.icon}
            </div>
            <span>{t(tab.label)}</span>
          </Link>
        );
      })}
    </div>
  );
}
