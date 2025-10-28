<template>
  <div class="space-y-4">
    <!-- Date & Time Picker Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label :for="`datepicker-${id}`" class="block text-sm font-medium text-gray-700 mb-2">
          {{ label }}
        </label>
        <input
          :id="`datepicker-${id}`"
          v-model="selectedDate"
          type="date"
          class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <!-- Time Picker with Common Class Times -->
      <div>
        <label :for="`time-${id}`" class="block text-sm font-medium text-gray-700 mb-2">
          Time (24h)
        </label>
        <div class="flex gap-2">
          <select
            :id="`time-${id}`"
            v-model="selectedTime"
            class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a time...</option>
            <optgroup label="Morning">
              <option v-for="time in morningTimes" :key="`morning-${time}`" :value="time">
                {{ time }}
              </option>
            </optgroup>
            <optgroup label="Afternoon">
              <option v-for="time in afternoonTimes" :key="`afternoon-${time}`" :value="time">
                {{ time }}
              </option>
            </optgroup>
            <optgroup label="Evening">
              <option v-for="time in eveningTimes" :key="`evening-${time}`" :value="time">
                {{ time }}
              </option>
            </optgroup>
            <optgroup label="Custom">
              <option value="custom">Custom time...</option>
            </optgroup>
          </select>
          <!-- Custom time input (hidden by default) -->
          <input
            v-if="showCustomTime"
            v-model="customTime"
            type="time"
            class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            @change="useCustomTime"
          />
        </div>
      </div>
    </div>

    <!-- Duration Selector (Optional) -->
    <div v-if="showDuration" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Duration</label>
        <div class="flex gap-2">
          <button
            v-for="duration in [30, 45, 60]"
            :key="duration"
            type="button"
            @click="selectedDuration = duration"
            :class="[
              'flex-1 py-2 px-3 rounded-md text-sm font-medium transition',
              selectedDuration === duration
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-50',
            ]"
          >
            {{ duration }}m
          </button>
          <input
            v-model.number="selectedDuration"
            type="number"
            min="15"
            step="15"
            class="w-20 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Custom"
          />
        </div>
      </div>

      <!-- End Time Display -->
      <div v-if="computedEndTime">
        <label class="block text-sm font-medium text-gray-700 mb-2">End Time</label>
        <div class="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700">
          {{ computedEndTime }}
        </div>
      </div>
    </div>

    <!-- Full DateTime Display -->
    <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
      <p class="text-sm text-blue-900">
        <span class="font-medium">Selected:</span>
        {{ formattedSelection }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, PropType } from 'vue';
import dayjs from 'dayjs';

export default defineComponent({
  name: 'ClassDateTimePicker',
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: 'Select Date & Time',
    },
    showDuration: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      default: 60,
    },
  },
  emits: ['update:modelValue', 'update:duration'],
  setup(props, { emit }) {
    const id = ref(`picker-${Math.random().toString(36).substr(2, 9)}`);

    // Common school class times - on the hour and at :30
    const morningTimes = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'
    ];

    const afternoonTimes = [
      '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    const eveningTimes = [
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
    ];

    // Parse datetime string without timezone conversion
    const parseLocalDateTime = (dateTimeString: string) => {
      if (!dateTimeString) return { date: '', time: '' };
      // Handle both "YYYY-MM-DDTHH:mm" and "YYYY-MM-DD HH:mm" formats
      const match = dateTimeString.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
      if (match) {
        return { date: match[1], time: match[2] };
      }
      return { date: '', time: '' };
    };

    // Initialize values with defaults
    const initialDateTime = parseLocalDateTime(props.modelValue);
    const initialDate = initialDateTime.date || dayjs().format('YYYY-MM-DD');
    const initialTime = initialDateTime.time || '14:00';

    const selectedDate = ref<string>(initialDate);
    const selectedTime = ref<string>(initialTime);
    const customTime = ref<string>('');
    const showCustomTime = ref(false);
    const selectedDuration = ref(props.duration);

    // Initialize from modelValue
    watch(
      () => props.modelValue,
      (newValue) => {
        if (newValue) {
          const parsed = parseLocalDateTime(newValue);
          if (parsed.date && parsed.time) {
            selectedDate.value = parsed.date;
            selectedTime.value = parsed.time;
            showCustomTime.value = false;
          }
        }
      }
    );

    // Update modelValue when date or time changes
    const updateDateTime = () => {
      if (!selectedDate.value || !selectedTime.value) return;

      // Emit in datetime-local format (no timezone conversion)
      const combined = `${selectedDate.value}T${selectedTime.value}`;
      emit('update:modelValue', combined);
    };

    watch([selectedDate, selectedTime], updateDateTime);
    watch(selectedDuration, (newDuration) => {
      emit('update:duration', newDuration);
    });

    const useCustomTime = () => {
      if (customTime.value) {
        selectedTime.value = customTime.value;
        showCustomTime.value = false;
      }
    };

    const computedEndTime = computed(() => {
      if (!selectedDate.value || !selectedTime.value || !props.showDuration) {
        return null;
      }
      const startTime = dayjs(`${selectedDate.value}T${selectedTime.value}`);
      const endTime = startTime.add(selectedDuration.value, 'minute');
      return endTime.format('dddd, MMMM D, YYYY [at] HH:mm');
    });

    const formattedSelection = computed(() => {
      if (!selectedDate.value || !selectedTime.value) {
        return 'No date/time selected';
      }
      const dt = dayjs(`${selectedDate.value}T${selectedTime.value}`);
      const formatted = dt.format('dddd, MMMM D, YYYY [at] HH:mm');
      if (props.showDuration && selectedDuration.value) {
        const endTime = dt.add(selectedDuration.value, 'minute').format('HH:mm');
        return `${formatted} → ${endTime} (${selectedDuration.value}m)`;
      }
      return formatted;
    });

    // Watch for custom time selection
    watch(selectedTime, (newTime) => {
      if (newTime === 'custom') {
        showCustomTime.value = true;
        selectedTime.value = '';
      } else if (newTime && newTime !== 'custom') {
        showCustomTime.value = false;
      }
    });

    return {
      id,
      selectedDate,
      selectedTime,
      customTime,
      showCustomTime,
      selectedDuration,
      morningTimes,
      afternoonTimes,
      eveningTimes,
      useCustomTime,
      computedEndTime,
      formattedSelection,
    };
  },
});
</script>

<style scoped>
/* Optional: Add any component-specific styles if needed */
</style>
