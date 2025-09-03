<script setup lang="ts">
import { Map, GeoJSONSource } from 'maplibre-gl';
import destination from '@turf/destination';
import centroid from '@turf/centroid';
import { polygon } from '@turf/helpers';
import { ref, onMounted, watch, computed } from 'vue';
import type { Feature, Point, Geometry, GeoJsonProperties, Position } from 'geojson';
import { mapInit } from '@/utils/map-init';
import { SEGMENTS_SOURCE } from '@/constants/segments';

type Segment = Feature<Geometry, GeoJsonProperties>[];

let map: Map;
let segmentCounter = 0;
const mapElement = ref<HTMLElement | null>(null);

// State for creating new segments
const startPoint = ref<Feature<Point> | null>(null);

// Form state for both creating and editing
const distance = ref(500);
const azimuth = ref(225);
const deflection = ref(90);

// Data store
const savedSegments = ref<Segment[]>([]);

// State for editing existing segments
const editingSegmentId = ref<number | null>(null);
const originalSegmentData = ref<{ distance: number; azimuth: number; deflection: number } | null>(null);

// Helper function to generate segment features
const generateSegmentFeatures = (
  start: Position,
  dist: number,
  az: number,
  def: number,
  id: number | null,
  state: 'preview' | 'saved' | 'editing'
): Segment => {
  const mainEnd = destination(start, dist, az, { units: 'kilometers' }).geometry.coordinates;
  const deflectedEnd = destination(start, dist, az - def, { units: 'kilometers' }).geometry.coordinates;
  const triangle = polygon([[start, mainEnd, deflectedEnd, start]]);
  const centerPoint = centroid(triangle);
  const lineDefinitions = [
    { name: 'main', coords: [start, mainEnd] },
    { name: 'deflected', coords: [start, deflectedEnd] },
    { name: 'closing', coords: [mainEnd, deflectedEnd] },
  ];
  const properties: GeoJsonProperties = {
    state,
    segmentId: id,
    distance: dist,
    azimuth: az,
    deflection: def,
  };
  return [
    { type: 'Feature', geometry: { type: 'Point', coordinates: start }, properties },
    { type: 'Feature', geometry: { type: 'Point', coordinates: mainEnd }, properties },
    { type: 'Feature', geometry: { type: 'Point', coordinates: deflectedEnd }, properties },
    ...lineDefinitions.map((d) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: d.coords },
      properties: { ...properties, type: d.name },
    })),
    {
      type: 'Feature' as const,
      geometry: centerPoint.geometry,
      properties: {
        ...properties,
        label: `${dist} km,\naz: ${az}° def: ${def}°`,
      },
    },
  ];
};

const previewSegment = computed<Segment>(() => {
  if (!startPoint.value) return [];
  return generateSegmentFeatures(
    startPoint.value.geometry.coordinates,
    distance.value,
    azimuth.value,
    deflection.value,
    null,
    'preview'
  );
});

const allFeatures = computed(() => {
  const features = savedSegments.value.flatMap(segment => {
    const props = segment[0].properties;
    if (props?.segmentId === editingSegmentId.value) {
      const startCoord = (segment[0] as Feature<Point>)?.geometry.coordinates;
      if (!startCoord) return segment;
      // Visually update the segment being edited in real-time using form values
      return generateSegmentFeatures(
        startCoord,
        distance.value,
        azimuth.value,
        deflection.value,
        editingSegmentId.value,
        'editing'
      );
    }
    return segment.map(f => ({ ...f, properties: { ...f.properties, state: 'saved' } }));
  });

  return [...features, ...previewSegment.value];
});

const handleFormSubmit = () => {
  // --- UPDATE existing segment ---
  if (isEditing.value) {
    const segmentIndex = savedSegments.value.findIndex(seg => seg[0]?.properties?.segmentId === editingSegmentId.value);
    if (segmentIndex === -1) return;

    const segmentToUpdate = savedSegments.value[segmentIndex];
    const startCoord = (segmentToUpdate[0] as Feature<Point>)?.geometry.coordinates;

    const updatedSegment = generateSegmentFeatures(
      startCoord,
      distance.value,
      azimuth.value,
      deflection.value,
      editingSegmentId.value,
      'saved' // Change state back to 'saved'
    );
    savedSegments.value.splice(segmentIndex, 1, updatedSegment);
    cancelEditing(); // Exit editing mode
    return;
  }

  // --- CREATE new segment ---
  if (!startPoint.value) return;
  const segmentToSave = generateSegmentFeatures(
    startPoint.value.geometry.coordinates,
    distance.value,
    azimuth.value,
    deflection.value,
    segmentCounter,
    'saved'
  );
  savedSegments.value.push(segmentToSave);
  segmentCounter++;
  startPoint.value = null;
  // Reset form to defaults after creating
  distance.value = 500;
  azimuth.value = 225;
  deflection.value = 90;
};

const cancelEditing = () => {
  editingSegmentId.value = null;
  originalSegmentData.value = null;
  // Reset form to defaults
  distance.value = 500;
  azimuth.value = 225;
  deflection.value = 90;
};

const updateMap = () => {
  const source: GeoJSONSource | undefined = map?.getSource(SEGMENTS_SOURCE);
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features: allFeatures.value,
    });
  }
};

watch(allFeatures, updateMap, { deep: true });

onMounted(() => {
  if (mapElement.value) {
    map = new Map({
      container: mapElement.value,
      style: 'https://demotiles.maplibre.org/globe.json',
      center: [0, 0],
      zoom: 2,
    });
    map.on('load', () => {
      mapInit(map);
      updateMap();
    });
    map.on('click', (event) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['saved-line-layer', 'saved-point-layer', 'saved-labels-layer', 'editing-line-layer', 'editing-point-layer', 'editing-labels-layer'],
      });

      if (features.length > 0 && features[0].properties && typeof features[0].properties.segmentId === 'number') {
        startPoint.value = null; // Disable creation mode
        const props = features[0].properties;
        editingSegmentId.value = props.segmentId;

        // Populate form with segment data
        distance.value = props.distance;
        azimuth.value = props.azimuth;
        deflection.value = props.deflection;

        // Store original data to check for changes
        originalSegmentData.value = {
          distance: props.distance,
          azimuth: props.azimuth,
          deflection: props.deflection,
        };
      } else {
        // Clicked on empty space
        cancelEditing(); // Exit editing mode if active
        startPoint.value = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [event.lngLat.lng, event.lngLat.lat] },
          properties: {},
        };
      }
    });
  }
});

const isEditing = computed(() => editingSegmentId.value !== null);
const isFormDirty = computed(() => {
  if (!isEditing.value || !originalSegmentData.value) {
    return false;
  }
  return (
    distance.value !== originalSegmentData.value.distance ||
    azimuth.value !== originalSegmentData.value.azimuth ||
    deflection.value !== originalSegmentData.value.deflection
  );
});
</script>

<template>
  <div class="map-container">
    <div ref="mapElement" />
    <form @submit.prevent="handleFormSubmit">
      <h3>{{ isEditing ? 'Редактирование' : 'Новый сегмент' }}</h3>
      <label>
        Расстояние (км):
        <input type="number" v-model.number="distance" min="0" />
      </label>
      <label>
        Азимут (°):
        <input type="number" v-model.number="azimuth" min="0" max="359" />
      </label>
      <label>
        Отклонение (°):
        <input type="number" v-model.number="deflection" min="-180" max="180" />
      </label>

      <button v-if="!isEditing" type="submit" :disabled="!startPoint">Сохранить сегмент</button>
      <button v-if="isEditing" type="submit" :disabled="!isFormDirty">Сохранить изменения</button>
      <button type="button" v-if="isEditing" @click="cancelEditing">Отменить</button>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.map-container {
  display: flex;
}

form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 30px;
  margin-bottom: 10px;
  width: 250px;

  input {
    width: 100%;
    box-sizing: border-box;
  }
  button {
    margin-top: 5px;
  }
}

.maplibregl-map {
  border: 1px solid #ccc;
  width: 1200px;
  height: 80vh;
}
</style>
