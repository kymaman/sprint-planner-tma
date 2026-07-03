import type { ComponentType } from 'react';

import { TodayPage } from '@/pages/TodayPage';
import { WeekPage } from '@/pages/WeekPage';
import { SprintPage } from '@/pages/SprintPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { SetupWizard } from '@/pages/SetupWizard';
import { SettingsPage } from '@/pages/SettingsPage';

interface Route {
  path: string;
  Component: ComponentType;
  title?: string;
}

export const routes: Route[] = [
  { path: '/', Component: TodayPage, title: 'Today' },
  { path: '/week', Component: WeekPage, title: 'Week' },
  { path: '/sprint', Component: SprintPage, title: 'Sprint' },
  { path: '/review', Component: ReviewPage, title: 'Review' },
  { path: '/setup', Component: SetupWizard, title: 'Setup' },
  { path: '/settings', Component: SettingsPage, title: 'Settings' },
];
