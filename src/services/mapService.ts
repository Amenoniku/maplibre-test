import type { Feature, Geometry } from 'geojson';

import {
  GeoJSONSource,
  type LngLatLike,
  Map,
  MapMouseEvent,
  Point,
} from 'maplibre-gl';

import { LAYER_CONFIGS } from '@/constants/map';
import { SEGMENTS_SOURCE } from '@/constants/segments';

/**
 * Управляет экземпляром MapLibre GL JS, включая инициализацию,
 * управление слоями и обработку событий. Этот сервис абстрагирует
 * детали реализации карты от остальной части приложения.
 */
export class MapService {
  private map: Map | null = null;

  /**
   * Удаляет экземпляр карты и очищает ресурсы.
   */
  public destroy(): void {
    this.map?.remove();
    this.map = null;
  }

  /**
   * Инициализирует экземпляр карты в заданном HTML-контейнере.
   * @param container - HTML-элемент для рендеринга карты.
   * @returns Промис, который разрешается экземпляром карты после ее полной загрузки.
   */
  public initialize(container: HTMLElement): Promise<Map> {
    return new Promise((resolve) => {
      this.map = new Map({
        center: [0, 0] as LngLatLike,
        container,
        style: 'https://demotiles.maplibre.org/globe.json',
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
   * Регистрирует функцию обратного вызова для события клика на карте.
   * @param callback - Функция, которая будет выполняться при клике на карту.
   */
  public on(eventName: 'click', callback: (e: MapMouseEvent) => void): void {
    this.map?.on(eventName, callback);
  }

  /**
   * Запрашивает отображаемые объекты на карте в определенной точке.
   * @param point - Точка на экране для запроса.
   * @param layers - Массив идентификаторов слоев для запроса.
   * @returns Массив объектов, найденных в точке запроса.
   */
  public queryRenderedFeatures(
    point: Point,
    layers: string[],
  ): Feature<Geometry>[] {
    if (!this.map) {
      return [];
    }
    return this.map.queryRenderedFeatures(point, {
      layers,
    }) as Feature<Geometry>[];
  }

  /**
   * Обновляет данные GeoJSON для источника сегментов.
   * @param features - Массив объектов GeoJSON для отображения.
   */
  public updateSource(features: Feature<Geometry>[]): void {
    if (!this.map) {
      return;
    }
    const source = this.map.getSource(SEGMENTS_SOURCE) as
      | GeoJSONSource
      | undefined;
    if (source) {
      source.setData({
        features,
        type: 'FeatureCollection',
      });
    }
  }

  /**
   * Вспомогательная функция для добавления набора слоев (точки, линии, метки) для заданного состояния.
   * @param state - Состояние сегмента ('preview', 'saved', 'editing').
   * @param config - Конфигурация стиля для этого состояния.
   */
  private addLayersForState(
    state: 'editing' | 'preview' | 'saved',
    config: (typeof LAYER_CONFIGS)[keyof typeof LAYER_CONFIGS],
  ): void {
    if (!this.map) {
      return;
    }
    const { map } = this;

    map.addLayer({
      filter: [
        'all',
        ['==', 'state', state],
        ['==', '$type', 'Point'],
        ['!has', 'label'],
      ],
      id: `${state}-point-layer`,
      paint: {
        'circle-color': config.color,
        'circle-radius': config.pointRadius,
      },
      source: SEGMENTS_SOURCE,
      type: 'circle',
    });

    map.addLayer({
      filter: ['==', 'state', state],
      id: `${state}-line-layer`,
      paint: {
        'line-color': config.color,
        'line-width': config.lineWidth,
      },
      source: SEGMENTS_SOURCE,
      type: 'line',
    });

    map.addLayer({
      filter: ['all', ['==', 'state', state], ['has', 'label']],
      id: `${state}-labels-layer`,
      layout: {
        'text-anchor': 'center',
        'text-field': ['get', 'label'],
        'text-offset': [0, 0],
        'text-size': config.labelSize,
      },
      paint: {
        'text-color': config.color,
        'text-halo-color': config.labelHaloColor,
        'text-halo-width': 1,
      },
      source: SEGMENTS_SOURCE,
      type: 'symbol',
    });
  }

  /**
   * Настраивает начальный источник GeoJSON и все слои для различных состояний сегментов.
   */
  private setupSourceAndLayers(): void {
    if (!this.map) {
      return;
    }
    this.map.addSource(SEGMENTS_SOURCE, {
      data: {
        features: [],
        type: 'FeatureCollection',
      },
      type: 'geojson',
    });

    this.addLayersForState('preview', LAYER_CONFIGS.PREVIEW);
    this.addLayersForState('saved', LAYER_CONFIGS.SAVED);
    this.addLayersForState('editing', LAYER_CONFIGS.EDITING);
  }
}
