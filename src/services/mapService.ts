import { Map, GeoJSONSource, MapMouseEvent, LngLatLike, Point } from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { SEGMENTS_SOURCE } from '@/constants/segments';

const LAYER_CONFIGS = {
  PREVIEW: {
    color: '#0000ff',
    pointRadius: 4,
    lineWidth: 2,
    labelSize: 12,
    labelHaloColor: '#ffffff',
  },
  SAVED: {
    color: '#000000',
    pointRadius: 4,
    lineWidth: 2,
    labelSize: 12,
    labelHaloColor: '#ffffff',
  },
  EDITING: {
    color: '#00ff00',
    pointRadius: 5,
    lineWidth: 3,
    labelSize: 13,
    labelHaloColor: '#000000',
  },
};

/**
 * Управляет экземпляром MapLibre GL JS, включая инициализацию,
 * управление слоями и обработку событий. Этот сервис абстрагирует
 * детали реализации карты от остальной части приложения.
 */
export class MapService {
  private map: Map | null = null;

  /**
   * Инициализирует экземпляр карты в заданном HTML-контейнере.
   * @param container - HTML-элемент для рендеринга карты.
   * @returns Промис, который разрешается экземпляром карты после ее полной загрузки.
   */
  public initialize(container: HTMLElement): Promise<Map> {
    return new Promise((resolve) => {
      this.map = new Map({
        container,
        style: 'https://demotiles.maplibre.org/globe.json',
        center: [0, 0] as LngLatLike,
        zoom: 2,
      });

      this.map.on('load', () => {
        this.setupSourceAndLayers();
        if (this.map) {
          resolve(this.map);
        }
      });
    });
  }

  /**
   * Обновляет данные GeoJSON для источника сегментов.
   * @param features - Массив объектов GeoJSON для отображения.
   */
  public updateSource(features: Feature<Geometry>[]): void {
    if (!this.map) return;
    const source = this.map.getSource(SEGMENTS_SOURCE) as GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }

  /**
   * Запрашивает отображаемые объекты на карте в определенной точке.
   * @param point - Точка на экране для запроса.
   * @param layers - Массив идентификаторов слоев для запроса.
   * @returns Массив объектов, найденных в точке запроса.
   */
  public queryRenderedFeatures(point: Point, layers: string[]): Feature<Geometry>[] {
    if (!this.map) return [];
    return this.map.queryRenderedFeatures(point, { layers }) as Feature<Geometry>[];
  }

  /**
   * Регистрирует функцию обратного вызова для события клика на карте.
   * @param callback - Функция, которая будет выполняться при клике на карту.
   */
  public on(eventName: 'click', callback: (e: MapMouseEvent) => void): void {
    this.map?.on(eventName, callback);
  }

  /**
   * Удаляет экземпляр карты и очищает ресурсы.
   */
  public destroy(): void {
    this.map?.remove();
    this.map = null;
  }

  /**
   * Настраивает начальный источник GeoJSON и все слои для различных состояний сегментов.
   */
  private setupSourceAndLayers(): void {
    if (!this.map) return;
    this.map.addSource(SEGMENTS_SOURCE, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    this.addLayersForState('preview', LAYER_CONFIGS.PREVIEW);
    this.addLayersForState('saved', LAYER_CONFIGS.SAVED);
    this.addLayersForState('editing', LAYER_CONFIGS.EDITING);
  }

  /**
   * Вспомогательная функция для добавления набора слоев (точки, линии, метки) для заданного состояния.
   * @param state - Состояние сегмента ('preview', 'saved', 'editing').
   * @param config - Конфигурация стиля для этого состояния.
   */
  private addLayersForState(
    state: 'preview' | 'saved' | 'editing',
    config: typeof LAYER_CONFIGS[keyof typeof LAYER_CONFIGS]
  ): void {
    if (!this.map) return;
    const map = this.map;

    map.addLayer({
      id: `${state}-point-layer`,
      type: 'circle',
      source: SEGMENTS_SOURCE,
      paint: {
        'circle-radius': config.pointRadius,
        'circle-color': config.color,
      },
      filter: ['all', ['==', 'state', state], ['==', '$type', 'Point'], ['!has', 'label']],
    });

    map.addLayer({
      id: `${state}-line-layer`,
      type: 'line',
      source: SEGMENTS_SOURCE,
      paint: {
        'line-color': config.color,
        'line-width': config.lineWidth,
      },
      filter: ['==', 'state', state],
    });

    map.addLayer({
      id: `${state}-labels-layer`,
      type: 'symbol',
      source: SEGMENTS_SOURCE,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': config.labelSize,
        'text-offset': [0, 0],
        'text-anchor': 'center',
      },
      paint: {
        'text-color': config.color,
        'text-halo-color': config.labelHaloColor,
        'text-halo-width': 1,
      },
      filter: ['all', ['==', 'state', state], ['has', 'label']],
    });
  }
}
