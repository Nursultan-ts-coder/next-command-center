import { useEffect, useState } from 'react';

let isRegistered = false;
let registering: Promise<void> | null = null;

async function registerChartJs() {
  if (isRegistered) return;
  if (registering) return registering;

  registering = (async () => {
    try {
      const {
        Chart: ChartJS,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        ArcElement,
        RadialLinearScale,
        PolarAreaController,
        RadarController,
        ScatterController,
        Title,
        Tooltip,
        Legend,
        Filler,
      } = await import('chart.js');
      ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        ArcElement,
        RadialLinearScale,
        PolarAreaController,
        RadarController,
        ScatterController,
        Title,
        Tooltip,
        Legend,
        Filler
      );
      isRegistered = true;
    } catch (error) {
      registering = null; // Reset to allow retry on next call
      throw error;
    }
  })();

  return registering;
}

/**
 * Ensures Chart.js is registered before rendering chart components.
 * Returns true when ready to render.
 */
export function useIsChartJsReady() {
  const [isReady, setIsReady] = useState(isRegistered);

  useEffect(() => {
    if (isRegistered) {
      setIsReady(true);
      return;
    }
    registerChartJs().then(() => setIsReady(true));
  }, []);

  return isReady;
}
