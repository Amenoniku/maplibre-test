<script setup lang="ts">
import type { MapMouseEvent } from 'maplibre-gl';

import { onMounted, ref, watch } from 'vue';

import type { SegmentProperties, StartPoint } from '@/types/types';

import { useMap } from '@/composables/useMap';
import { useSegments } from '@/composables/useSegments';

const mapContainer = ref<HTMLElement | null>(null);

const {
  allFeatures,
  cancelEditing,
  deleteSegment,
  formData,
  handleFormSubmit,
  isEditing,
  isFormDirty,
  selectSegmentForEditing,
  startNewSegment,
  startPoint,
} = useSegments();

const { map, mapService } = useMap(mapContainer, allFeatures);

/**
 * Обрабатывает клики на карте для начала создания нового сегмента или
 * выбора существующего для редактирования.
 * @param event - Событие MapMouseEvent из события клика MapLibre.
 */
const handleMapClick = (event: MapMouseEvent) => {
  const features = mapService.queryRenderedFeatures(event.point, [
    'saved-line-layer',
    'saved-point-layer',
    'saved-labels-layer',
    'editing-line-layer',
    'editing-point-layer',
    'editing-labels-layer',
  ]);

  if (features.length > 0 && features[0].properties) {
    selectSegmentForEditing(features[0].properties as SegmentProperties);
  } else {
    startNewSegment({
      geometry: {
        coordinates: [event.lngLat.lng, event.lngLat.lat],
        type: 'Point',
      },
      properties: {},
      type: 'Feature',
    } as StartPoint);
  }
};

onMounted(() => {
  const unwatch = watch(map, (newMap) => {
    if (newMap) {
      newMap.on('click', handleMapClick);
      unwatch();
    }
  });
});
</script>

<template>
  <div class="map-container">
    <div ref="mapContainer" class="map" />
    <form class="segment-form" @submit.prevent="handleFormSubmit">
      <h3>{{ isEditing ? 'Редактирование' : 'Новый сегмент' }}</h3>
      <label>
        Расстояние (км):
        <input v-model.number="formData.distance" type="number" min="0" />
      </label>
      <label>
        Азимут (°):
        <input
          v-model.number="formData.azimuth"
          type="number"
          min="0"
          max="359"
        />
      </label>
      <label>
        Отклонение (°):
        <input
          v-model.number="formData.deflection"
          type="number"
          min="-180"
          max="180"
        />
      </label>

      <button v-if="!isEditing" type="submit" :disabled="!startPoint">
        Сохранить сегмент
      </button>

      <div v-if="isEditing" class="editing-controls">
        <button type="button" @click="cancelEditing">Отменить</button>
        <button class="delete-button" type="button" @click="deleteSegment">
          Удалить
        </button>
        <button class="save-button" type="submit" :disabled="!isFormDirty">
          Сохранить
        </button>
      </div>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.map-container {
  display: flex;
  gap: 20px;
}

.map {
  flex-shrink: 0;
  width: 1200px;
  height: 80vh;
  border: 1px solid #cccccc;
}

.segment-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 250px;
  padding: 10px;

  h3 {
    margin-top: 0;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  input {
    box-sizing: border-box;
    width: 100%;
    padding: 8px;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  button {
    margin-top: 5px;
  }

  .editing-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    button {
      flex: 1;
    }

    .delete-button {
      color: red;
      border-color: red;
    }

    .save-button {
      color: green;
      border-color: green;
    }
  }
}
</style>
