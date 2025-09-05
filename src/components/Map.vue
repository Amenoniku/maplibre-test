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
  <div class="map-widget">
    <div ref="mapContainer" class="map-widget__map" />
    <form class="segment-form" @submit.prevent="handleFormSubmit">
      <h3 class="segment-form__title">
        {{ isEditing ? 'Редактирование' : 'Новый сегмент' }}
      </h3>
      <label class="segment-form__label">
        Расстояние (км):
        <input
          v-model.number="formData.distance"
          class="segment-form__input"
          type="number"
          min="0"
        />
      </label>
      <label class="segment-form__label">
        Азимут (°):
        <input
          v-model.number="formData.azimuth"
          class="segment-form__input"
          type="number"
          min="0"
          max="359"
        />
      </label>
      <label class="segment-form__label">
        Отклонение (°):
        <input
          v-model.number="formData.deflection"
          class="segment-form__input"
          type="number"
          min="-180"
          max="180"
        />
      </label>

      <button
        v-if="!isEditing"
        class="segment-form__button"
        type="submit"
        :disabled="!startPoint"
      >
        Сохранить сегмент
      </button>

      <div v-if="isEditing" class="segment-form__controls">
        <button
          class="segment-form__button"
          type="button"
          @click="cancelEditing"
        >
          Отменить
        </button>
        <button
          class="segment-form__button segment-form__button--delete"
          type="button"
          @click="deleteSegment"
        >
          Удалить
        </button>
        <button
          class="segment-form__button segment-form__button--save"
          type="submit"
          :disabled="!isFormDirty"
        >
          Сохранить
        </button>
      </div>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.map-widget {
  display: flex;
  gap: 20px;

  &__map {
    flex-shrink: 0;
    width: 1200px;
    height: 80vh;
    border: 1px solid #cccccc;
  }
}

.segment-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 250px;
  padding: 10px;

  &__title {
    margin-top: 0;
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &__input {
    box-sizing: border-box;
    width: 100%;
    padding: 8px;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  &__button {
    margin-top: 5px;

    &--delete {
      color: red;
      border-color: red;
    }

    &--save {
      color: green;
      border-color: green;
    }
  }

  &__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .segment-form__button {
      flex: 1;
    }
  }
}
</style>
