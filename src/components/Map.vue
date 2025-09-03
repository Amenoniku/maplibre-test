<script setup lang="ts">
import { Map, GeoJSONSource } from 'maplibre-gl';
import destination from '@turf/destination';
import centroid from '@turf/centroid';
import { polygon } from '@turf/helpers';
import { ref, onMounted, watch, computed } from 'vue';
import type { Feature, Point, Geometry, GeoJsonProperties } from 'geojson';
import { mapInit } from '@/utils/map-init';
import { SEGMENTS_SOURCE } from '@/constants/segments';

type Segment = Feature<Geometry, GeoJsonProperties>[];

let map: Map;
let segmentCounter = 0;
const mapElement = ref<HTMLElement | null>(null);
const startPoint = ref<Feature<Point> | null>(null);
const distance = ref(500);
const azimuth = ref(225);
const deflection = ref(90);
const savedSegments = ref<Segment[]>([]);

const previewSegment = computed<Segment>(() => {
  if (!startPoint.value) return [];
  const { main, deflected } = getDeflectedLine.value;
  const [startCoord, mainEndCoord] = main;
  const deflectedEndCoord = deflected[1];
  const state = 'preview';
  const triangle = polygon([[startCoord, mainEndCoord, deflectedEndCoord, startCoord]]);
  const centerPoint = centroid(triangle);
  const lineDefinitions = [
    { name: 'main', coords: main },
    { name: 'deflected', coords: deflected },
    { name: 'closing', coords: [mainEndCoord, deflectedEndCoord] },
  ];
  return [
    { ...startPoint.value, properties: { ...startPoint.value.properties, state } },
    { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: mainEndCoord }, properties: { state } },
    { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: deflectedEndCoord }, properties: { state } },
    ...lineDefinitions.map((def) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: def.coords },
      properties: { type: def.name, state },
    })),
    {
      type: 'Feature' as const,
      geometry: centerPoint.geometry,
      properties: {
        state,
        label: `${distance.value} km,\naz: ${azimuth.value}°, def: ${deflection.value}°`,
      },
    },
  ];
});
const allFeatures = computed(() => {
  return [
    ...savedSegments.value.flat(),
    ...previewSegment.value
  ];
});
const getAzimuthLine = computed(() => {
  return destination(
    startPoint.value?.geometry.coordinates || [0, 0],
    distance.value,
    azimuth.value, {
    units: 'kilometers'
  }).geometry.coordinates;
});
const getDeflectedLine = computed(() => {
  const start = startPoint.value?.geometry.coordinates || [0, 0];
  const deflectedEnd = destination(start, distance.value, azimuth.value - deflection.value, {
    units: 'kilometers'
  }).geometry.coordinates;
  return {
    main: [start, getAzimuthLine.value],
    deflected: [start, deflectedEnd]
  };
});
const saveSegment = () => {
  if (!startPoint.value || !map) return;
  const segmentToSave = previewSegment.value.map(feature => ({
    ...feature,
    properties: {
      ...feature.properties,
      state: 'saved',
      segmentId: segmentCounter
    }
  }));
  savedSegments.value.push(segmentToSave);
  segmentCounter++;
  startPoint.value = null;
}
const updateMap = () => {
  const source: GeoJSONSource | undefined = map?.getSource(SEGMENTS_SOURCE);
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features: allFeatures.value
    });
  }
}

watch(allFeatures, updateMap, { deep: true })

onMounted(() => {
  if (mapElement.value) {
  	map = new Map({
  	container: mapElement.value,
  		style: 'https://demotiles.maplibre.org/globe.json',
  		center: [0, 0],
  		zoom: 2
  	});
    map.on('load', () => {
      mapInit(map)
      updateMap();
    });
    map.on('click', (event) => {
      startPoint.value = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [event.lngLat.lng, event.lngLat.lat]
        },
        properties: {}
      };
    });
  }
});

</script>

<template>

<div class="map-container">
  <div ref="mapElement" />
  <form @submit.prevent="saveSegment">
    <label>
      Расстояние (км):
      <input type="number" v-model="distance" min="0" />
    </label>
    <label>
      Азимут (°):
      <input type="number" v-model="azimuth" min="0" max="359" />
    </label>
    <label>
      Отклонение (°):
      <input type="number" v-model="deflection" min="-180" max="180" />
    </label>
    <button type="submit">Сохранить сегмент</button>
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
  input {
    width: 100% ;
  }
}

.maplibregl-map {
  border: 1px solid #ccc;
  width: 1200px;
  height: 80vh;
}
</style>
