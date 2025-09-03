import { Map } from 'maplibre-gl';
import { SEGMENTS_SOURCE } from '@/constants/segments';

export const mapInit = (map: Map) => {
  if (!map) return;
  map.addSource(SEGMENTS_SOURCE, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  })

  // Слои для предпросмотра
  map.addLayer({
    id: 'preview-point-layer',
    type: 'circle',
    source: SEGMENTS_SOURCE,
    paint: {
      'circle-radius': 4,
      'circle-color': '#ff0000',
    },
    filter: ['all', ['==', 'state', 'preview'], ['==', '$type', 'Point'], ['!has', 'label']],
  });
  map.addLayer({
    id: 'preview-line-layer',
    type: 'line',
    source: SEGMENTS_SOURCE,
    paint: {
      'line-color': '#0000ff',
      'line-width': 2
    },
    filter: ['==', 'state', 'preview'],
  });
  map.addLayer({
    id: 'preview-labels-layer',
    type: 'symbol',
    source: SEGMENTS_SOURCE,
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 12,
      'text-offset': [0, 0],
      'text-anchor': 'center',
    },
    paint: {
      'text-color': '#0000ff',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1,
    },
    filter: ['all', ['==', 'state', 'preview'], ['has', 'label']],
  });

  // Слои для сохраненных данных
  map.addLayer({
    id: 'saved-point-layer',
    type: 'circle',
    source: SEGMENTS_SOURCE,
    paint: {
      'circle-radius': 4,
      'circle-color': '#000000',
    },
    filter: ['all', ['==', 'state', 'saved'], ['==', '$type', 'Point'], ['!has', 'label']]
  });
  map.addLayer({
    id: 'saved-line-layer',
    type: 'line',
    source: SEGMENTS_SOURCE,
    paint: {
      'line-color': '#000000',
      'line-width': 2
    },
    filter: ['==', 'state', 'saved'],
  });
  map.addLayer({
    id: 'saved-labels-layer',
    type: 'symbol',
    source: SEGMENTS_SOURCE,
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 12,
      'text-offset': [0, 0],
      'text-anchor': 'center',
    },
    paint: {
      'text-color': '#000000',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1,
    },
    filter: ['all', ['==', 'state', 'saved'], ['has', 'label']],
  });

  // Слои для редактируемого сегмента
  map.addLayer({
    id: 'editing-point-layer',
    type: 'circle',
    source: SEGMENTS_SOURCE,
    paint: {
      'circle-radius': 5,
      'circle-color': '#00ff00', // Green
    },
    filter: ['all', ['==', 'state', 'editing'], ['==', '$type', 'Point'], ['!has', 'label']]
  });
  map.addLayer({
    id: 'editing-line-layer',
    type: 'line',
    source: SEGMENTS_SOURCE,
    paint: {
      'line-color': '#00ff00', // Green
      'line-width': 3
    },
    filter: ['==', 'state', 'editing'],
  });
  map.addLayer({
    id: 'editing-labels-layer',
    type: 'symbol',
    source: SEGMENTS_SOURCE,
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 13,
      'text-offset': [0, 0],
      'text-anchor': 'center',
    },
    paint: {
      'text-color': '#00ff00', // Green
      'text-halo-color': '#000000',
      'text-halo-width': 1,
    },
    filter: ['all', ['==', 'state', 'editing'], ['has', 'label']],
  });
};
