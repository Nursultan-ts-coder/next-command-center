import { AppRootProps, PageLayoutType } from '@grafana/data';
import { PluginPage } from '@grafana/runtime';
import { lazy, Suspense } from 'react';

import type { CommandCenterSettings } from '../../constants';
import { applySettings } from '../../next-config';
import { PluginPropsContext } from '../../utils/utils.plugin';

/** The Command Center (src/next/command-center): Global, segment and store pages, in one page. */
const CommandCenterApp = lazy(() => import('@/command-center'));

/** The app's root page: Grafana's page frame (without its header) around the NEXT Command Center. */
function App(props: AppRootProps<CommandCenterSettings>) {
  applySettings(props.meta.jsonData);

  return (
    <PluginPropsContext.Provider value={props}>
      {/* Canvas: no plugin title/description header (from plugin.json); the app has its own. */}
      <PluginPage layout={PageLayoutType.Canvas}>
        <Suspense fallback={null}>
          <CommandCenterApp />
        </Suspense>
      </PluginPage>
    </PluginPropsContext.Provider>
  );
}

export default App;
