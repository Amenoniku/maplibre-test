<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useSegments } from '@/composables/useSegments';
import { useMap } from '@/composables/useMap';
import type { StartPoint, SegmentProperties } from '@/types/types';
import type { MapMouseEvent } from 'maplibre-gl';

const mapContainer = ref<HTMLElement | null>(null);

const {
  formData,
  allFeatures,
  isEditing,
  isFormDirty,
  startPoint,
  handleFormSubmit,
  cancelEditing,
  startNewSegment,
  selectSegmentForEditing,
  deleteSegment
} = useSegments();

const { map, mapService } = useMap(mapContainer, allFeatures);

/**
 * Обрабатывает клики на карте для начала создания нового сегмента или
 * выбора существующего для редактирования.
 * @param event - Событие MapMouseEvent из события клика MapLibre.
 */
const handleMapClick = (event: MapMouseEvent) => {
  const features = mapService.queryRenderedFeatures(event.point, [
    'saved-line-layer', 'saved-point-layer', 'saved-labels-layer',
    'editing-line-layer', 'editing-point-layer', 'editing-labels-layer'
  ]);

  if (features.length > 0 && features[0].properties) {
    selectSegmentForEditing(features[0].properties as SegmentProperties);
  } else {
    startNewSegment({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [event.lngLat.lng, event.lngLat.lat] },
      properties: {},
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
    <form @submit.prevent="handleFormSubmit" class="segment-form">
      <h3>{{ isEditing ? 'Редактирование' : 'Новый сегмент' }}</h3>
      <label>
        Расстояние (км):
        <input type="number" v-model.number="formData.distance" min="0" />
      </label>
      <label>
        Азимут (°):
        <input type="number" v-model.number="formData.azimuth" min="0" max="359" />
      </label>
      <label>
        Отклонение (°):
        <input type="number" v-model.number="formData.deflection" min="-180" max="180" />
      </label>

      <button v-if="!isEditing" type="submit" :disabled="!startPoint">Сохранить сегмент</button>

      <div v-if="isEditing" class="editing-controls">
        <button type="button" @click="cancelEditing">Отменить</button>
        <button class="delete-button" type="button" @click="deleteSegment">Удалить</button>
        <button class="save-button" type="submit" :disabled="!isFormDirty">Сохранить</button>
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
  border: 1px solid #ccc;
  width: 1200px;
  height: 80vh;
  flex-shrink: 0;
}

.segment-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 10px;
  min-width: 250px;

  h3 {
    margin-top: 0;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px;
    border: 1px solid #ccc;
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
