import type { Feature, Point } from 'geojson';

import { computed, ref } from 'vue';

import type {
  Segment,
  SegmentFormData,
  SegmentProperties,
  SegmentState,
  StartPoint,
} from '@/types/types';

import { DEFAULT_FORM_DATA } from '@/constants/segments';
import { generateSegmentFeatures } from '@/services/segmentService';

let segmentCounter = 0;
const savedSegments = ref<Segment[]>([]);
const editingSegmentId = ref<null | number>(null);
const startPoint = ref<null | StartPoint>(null);
const formData = ref<SegmentFormData>({ ...DEFAULT_FORM_DATA });
const originalSegmentData = ref<null | SegmentFormData>(null);

/**
 * Vue Composable для управления состоянием и бизнес-логикой сегментов карты.
 * Он инкапсулирует все реактивное состояние, вычисляемые свойства и методы,
 * связанные с созданием, редактированием и отображением сегментов.
 */
export function useSegments() {
  /**
   * Указывает, редактирует ли пользователь в данный момент существующий сегмент.
   */
  const isEditing = computed(() => editingSegmentId.value !== null);

  /**
   * Определяет, были ли изменены данные формы пользователем во время сеанса редактирования.
   */
  const isFormDirty = computed(() => {
    if (!isEditing.value || !originalSegmentData.value) {
      return false;
    }
    return (
      formData.value.distance !== originalSegmentData.value.distance ||
      formData.value.azimuth !== originalSegmentData.value.azimuth ||
      formData.value.deflection !== originalSegmentData.value.deflection
    );
  });

  /**
   * Создает временный сегмент "предпросмотра" на основе текущей начальной точки и данных формы.
   */
  const previewSegment = computed<Segment>(() => {
    if (!startPoint.value) {
      return [];
    }
    return generateSegmentFeatures(
      startPoint.value.geometry.coordinates,
      formData.value.distance,
      formData.value.azimuth,
      formData.value.deflection,
      { id: null, state: 'preview' },
    );
  });

  /**
   * Полная коллекция всех объектов для отображения на карте.
   * Включает сохраненные сегменты, сегмент, редактируемый в данный момент (с обновлениями в реальном времени),
   * и сегмент предпросмотра.
   */
  const allFeatures = computed(() => {
    const features = savedSegments.value.flatMap((segment) => {
      const props = segment[0].properties;
      if (props?.segmentId === editingSegmentId.value) {
        const startCoord = (segment[0] as Feature<Point>)?.geometry.coordinates;
        return generateSegmentFeatures(
          startCoord,
          formData.value.distance,
          formData.value.azimuth,
          formData.value.deflection,
          { id: editingSegmentId.value, state: 'editing' },
        );
      }
      return segment.map((f) => ({
        ...f,
        properties: { ...f.properties, state: 'saved' as SegmentState },
      }));
    });

    return [...features, ...previewSegment.value];
  });

  /**
   * Сбрасывает форму к значениям по умолчанию.
   */
  const resetForm = () => {
    formData.value = { ...DEFAULT_FORM_DATA };
  };

  /**
   * Выходит из режима редактирования, очищает любое связанное состояние и сбрасывает форму.
   */
  const cancelEditing = () => {
    editingSegmentId.value = null;
    originalSegmentData.value = null;
    resetForm();
  };

  /**
   * Инициирует процесс создания нового сегмента в заданной точке.
   * @param point - Объект GeoJSON Point, с которого должен начаться новый сегмент.
   */
  const startNewSegment = (point: StartPoint) => {
    cancelEditing();
    startPoint.value = point;
  };

  /**
   * Переводит выбранный сегмент в режим редактирования.
   * @param props - Свойства сегмента для редактирования.
   */
  const selectSegmentForEditing = (props: SegmentProperties) => {
    if (typeof props.segmentId !== 'number') {
      return;
    }
    startPoint.value = null;
    editingSegmentId.value = props.segmentId;

    const data = {
      azimuth: props.azimuth,
      deflection: props.deflection,
      distance: props.distance,
    };
    formData.value = { ...data };
    originalSegmentData.value = { ...data };
  };

  /**
   * Сохраняет новый сегмент.
   */
  const saveNewSegment = () => {
    if (!startPoint.value) {
      return;
    }
    const segmentToSave = generateSegmentFeatures(
      startPoint.value.geometry.coordinates,
      formData.value.distance,
      formData.value.azimuth,
      formData.value.deflection,
      { id: segmentCounter, state: 'saved' },
    );
    savedSegments.value.push(segmentToSave);
    segmentCounter++;
    startPoint.value = null;
    resetForm();
  };

  /**
   * Обновляет существующий сегмент.
   */
  const updateExistingSegment = () => {
    const segmentIndex = savedSegments.value.findIndex(
      (seg) => seg[0]?.properties?.segmentId === editingSegmentId.value,
    );
    if (segmentIndex === -1) {
      return;
    }

    const segmentToUpdate = savedSegments.value[segmentIndex];
    const startCoord = (segmentToUpdate[0] as Feature<Point>)?.geometry
      .coordinates;

    const updatedSegment = generateSegmentFeatures(
      startCoord,
      formData.value.distance,
      formData.value.azimuth,
      formData.value.deflection,
      { id: editingSegmentId.value, state: 'saved' },
    );
    savedSegments.value.splice(segmentIndex, 1, updatedSegment);
    cancelEditing();
  };

  /**
   * Удаляет существующий сегмент.
   */
  const deleteSegment = () => {
    if (
      editingSegmentId.value === null ||
      !confirm('Вы уверены, что хотите удалить сегмент?')
    ) {
      return;
    }
    const idx = savedSegments.value.findIndex(
      (seg) => seg[0]?.properties?.segmentId === editingSegmentId.value,
    );
    if (idx !== -1) {
      savedSegments.value.splice(idx, 1);
    }
    cancelEditing();
  };

  /**
   * Обрабатывает отправку формы, делегируя либо обновление, либо создание сегмента.
   */
  const handleFormSubmit = () => {
    if (isEditing.value) {
      updateExistingSegment();
    } else {
      saveNewSegment();
    }
  };

  return {
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
  };
}
