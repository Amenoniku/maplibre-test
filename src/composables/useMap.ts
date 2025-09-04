import type { Feature, Geometry } from 'geojson';
import type { Map } from 'maplibre-gl';

import { onMounted, onUnmounted, type Ref, shallowRef, watch } from 'vue';

import { MapService } from '@/services/mapService';

/**
 * Vue Composable для управления жизненным циклом экземпляра карты MapLibre GL JS.
 * Он абстрагирует инициализацию, обновление данных и очистку карты.
 *
 * @param mapContainer - Vue ref, указывающий на HTML-элемент, в котором будет отображаться карта.
 * @param features - Vue ref, содержащий массив объектов GeoJSON для отображения на карте.
 * @returns Объект, содержащий экземпляр карты и сервис карты для дальнейшего взаимодействия.
 */
export function useMap(
  mapContainer: Ref<HTMLElement | null>,
  features: Ref<Feature<Geometry>[]>,
) {
  const map = shallowRef<Map | null>(null);
  const mapService = new MapService();

  onMounted(() => {
    if (mapContainer.value) {
      mapService.initialize(mapContainer.value).then((mapInstance) => {
        map.value = mapInstance;
      });
    }
  });

  onUnmounted(() => {
    mapService.destroy();
  });

  watch(
    features,
    (newFeatures) => {
      mapService.updateSource(newFeatures);
    },
    { deep: true },
  );

  return { map, mapService };
}
