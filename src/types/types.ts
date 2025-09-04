import type { Feature, Point, Geometry, GeoJsonProperties } from 'geojson';

/**
 * Определяет визуальное и логическое состояние сегмента на карте.
 * - `preview`: Временный сегмент, который рисуется, но еще не сохранен.
 * - `saved`: Сегмент, который был сохранен.
 * - `editing`: Сохраненный сегмент, который в данный момент изменяется.
 */
export type SegmentState = 'preview' | 'saved' | 'editing';

/**
 * Свойства, связанные с каждым объектом GeoJSON, который составляет сегмент.
 * Это включает геометрические данные и информацию о состоянии.
 */
 export type SegmentProperties = {
   state: SegmentState;
   segmentId: number | null;
   distance: number;
   azimuth: number;
   deflection: number;
   label?: string;
   type?: 'main' | 'deflected' | 'closing';
 } & GeoJsonProperties;

/**
 * Сегмент представлен в виде коллекции объектов GeoJSON.
 * Обычно это включает точки для вершин, линии для ребер и точку для метки.
 */
export type Segment = Feature<Geometry, SegmentProperties>[];

/**
 * Представляет начальную точку для создания нового сегмента.
 */
export type StartPoint = Feature<Point>;

/**
 * Представляет структуру данных для формы, используемой для создания и редактирования сегментов.
 */
export interface SegmentFormData {
  distance: number;
  azimuth: number;
  deflection: number;
}
