import destination from '@turf/destination';
import centroid from '@turf/centroid';
import { polygon } from '@turf/helpers';
import type { Position } from 'geojson';
import type { Segment, SegmentState, SegmentProperties } from '@/types/types';

/**
 * Генерирует объекты GeoJSON, составляющие полный сегмент,
 * включая точки, линии и метку. Это чистая функция, которая
 * инкапсулирует геометрические расчеты для сегмента.
 *
 * @param start - Начальная координата (`[lng, lat]`) сегмента.
 * @param dist - Длина основной и отклоненной линий в километрах.
 * @param az - Азимут (направление) основной линии в градусах (0-359).
 * @param def - Угол отклонения от основной линии в градусах (от -180 до 180).
 * @param id - Уникальный идентификатор сегмента или `null` для предпросмотра.
 * @param state - Текущее состояние сегмента ('preview', 'saved' или 'editing').
 * @returns Массив объектов GeoJSON, представляющих сегмент.
 */
export const generateSegmentFeatures = (
  start: Position,
  dist: number,
  az: number,
  def: number,
  id: number | null,
  state: SegmentState
): Segment => {
  const mainEnd = destination(start, dist, az, { units: 'kilometers' }).geometry.coordinates;
  const deflectedEnd = destination(start, dist, az - def, { units: 'kilometers' }).geometry.coordinates;

  const triangle = polygon([[start, mainEnd, deflectedEnd, start]]);
  const centerPoint = centroid(triangle);

  const lineDefinitions = [
    { name: 'main' as const, coords: [start, mainEnd] },
    { name: 'deflected' as const, coords: [start, deflectedEnd] },
    { name: 'closing' as const, coords: [mainEnd, deflectedEnd] },
  ];

  const properties: SegmentProperties = {
    state,
    segmentId: id,
    distance: dist,
    azimuth: az,
    deflection: def,
  };

  const points: Segment = [
    { type: 'Feature', geometry: { type: 'Point', coordinates: start }, properties },
    { type: 'Feature', geometry: { type: 'Point', coordinates: mainEnd }, properties },
    { type: 'Feature', geometry: { type: 'Point', coordinates: deflectedEnd }, properties },
  ];

  const lines: Segment = lineDefinitions.map((d) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: d.coords },
    properties: { ...properties, type: d.name },
  }));

  const label: Segment = [
    {
      type: 'Feature',
      geometry: centerPoint.geometry,
      properties: {
        ...properties,
        label: `${dist} km,
az: ${az}° def: ${def}°`,
      },
    },
  ];

  return [...points, ...lines, ...label];
};
