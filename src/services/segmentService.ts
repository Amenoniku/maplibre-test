import type { Position } from 'geojson';

import centroid from '@turf/centroid';
import destination from '@turf/destination';
import { polygon } from '@turf/helpers';

import type { Segment, SegmentProperties, SegmentState } from '@/types/types';

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
interface SegmentGenerationOptions {
  id: null | number;
  state: SegmentState;
}

export const generateSegmentFeatures = (
  start: Position,
  dist: number,
  az: number,
  def: number,
  options: SegmentGenerationOptions,
): Segment => {
  const { id, state } = options;

  const mainEnd = destination(start, dist, az, { units: 'kilometers' }).geometry
    .coordinates;
  const deflectedEnd = destination(start, dist, az - def, {
    units: 'kilometers',
  }).geometry.coordinates;

  const triangle = polygon([[start, mainEnd, deflectedEnd, start]]);
  const centerPoint = centroid(triangle);

  const lineDefinitions = [
    { coords: [start, mainEnd], name: 'main' as const },
    { coords: [start, deflectedEnd], name: 'deflected' as const },
    { coords: [mainEnd, deflectedEnd], name: 'closing' as const },
  ];

  const properties: SegmentProperties = {
    azimuth: az,
    deflection: def,
    distance: dist,
    segmentId: id,
    state,
  };

  const points: Segment = [
    {
      geometry: { coordinates: start, type: 'Point' },
      properties,
      type: 'Feature',
    },
    {
      geometry: { coordinates: mainEnd, type: 'Point' },
      properties,
      type: 'Feature',
    },
    {
      geometry: { coordinates: deflectedEnd, type: 'Point' },
      properties,
      type: 'Feature',
    },
  ];

  const lines: Segment = lineDefinitions.map((d) => ({
    geometry: { coordinates: d.coords, type: 'LineString' },
    properties: { ...properties, type: d.name },
    type: 'Feature',
  }));

  const label: Segment = [
    {
      geometry: centerPoint.geometry,
      properties: {
        ...properties,
        label: `${dist} km,
az: ${az}° def: ${def}°`,
      },
      type: 'Feature',
    },
  ];

  return [...points, ...lines, ...label];
};
