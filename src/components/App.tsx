import { Navigate, Route, Routes, HashRouter, useLocation } from 'react-router-dom';
import { useLaunchParams } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { useEffect } from 'react';

import { routes } from '@/navigation/routes.tsx';
import { TabBar } from '@/components/TabBar';
import { UndoToast } from '@/components/UndoToast';
import { I18nProvider } from '@/i18n';
import { SprintStoreProvider, useSprintStore } from '@/store';

function AppContent() {
  const location = useLocation();
  const { state } = useSprintStore();
  const showTabBar = location.pathname !== '/setup';

  // Redirect to setup if no sprint exists
  useEffect(() => {
    if (!state.loading && !state.sprint && location.pathname !== '/setup') {
      window.location.hash = '#/setup';
    }
  }, [state.loading, state.sprint, location.pathname]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1 }}>
        <Routes>
          {routes.map((route) => <Route key={route.path} {...route} />)}
          <Route path="*" element={<Navigate to="/"/>}/>
        </Routes>
      </div>
      {showTabBar && <TabBar />}
      <UndoToast />
    </div>
  );
}

export function App() {
  const lp = useLaunchParams();

  return (
    <AppRoot
      appearance="dark"
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <I18nProvider>
        <SprintStoreProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </SprintStoreProvider>
      </I18nProvider>
    </AppRoot>
  );
}
