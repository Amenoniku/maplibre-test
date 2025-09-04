import type { Feature, GeoJsonProperties, Geometry, Point } from 'geojson';

/**
 * Сегмент представлен в виде коллекции объектов GeoJSON.
 * Обычно это включает точки для вершин, линии для ребер и точку для метки.
 */
export type Segment = Feature<Geometry, SegmentProperties>[];

/**
 * Представляет структуру данных для формы, используемой для создания и редактирования сегментов.
 */
export interface SegmentFormData {
  azimuth: number;
  deflection: number;
  distance: number;
}

/**
 * Свойства, связанные с каждым объектом GeoJSON, который составляет сегмент.
 * Это включает геометрические данные и информацию о состоянии.
 */
export type SegmentProperties = GeoJsonProperties & {
  azimuth: number;
  deflection: number;
  distance: number;
  label?: string;
  segmentId: null | number;
  state: SegmentState;
  type?: 'closing' | 'deflected' | 'main';
};

/**
 * Определяет визуальное и логическое состояние сегмента на карте.
 * - `preview`: Временный сегмент, который рисуется, но еще не сохранен.
 * - `saved`: Сегмент, который был сохранен.
 * - `editing`: Сохраненный сегмент, который в данный момент изменяется.
 */
export type SegmentState = 'editing' | 'preview' | 'saved';

/**
 * Представляет начальную точку для создания нового сегмента.
 */
export type StartPoint = Feature<Point>;
