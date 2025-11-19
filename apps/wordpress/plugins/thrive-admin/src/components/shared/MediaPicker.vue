<template>
  <div class="media-picker">
    <label :for="inputId" class="block text-sm font-medium text-gray-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="flex gap-2">
      <div class="flex-1">
        <input
          :id="inputId"
          :value="modelValue || ''"
          type="text"
          readonly
          :placeholder="placeholder"
          class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
        />
      </div>
      <button
        type="button"
        @click="openMediaPicker"
        class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      >
        Choose Image
      </button>
      <button
        v-if="modelValue"
        type="button"
        @click="clearImage"
        class="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
      >
        Clear
      </button>
    </div>

    <!-- Preview -->
    <div v-if="modelValue" class="mt-4">
      <div class="relative inline-block">
        <img
          :src="modelValue"
          :alt="label"
          class="h-32 w-auto rounded-md border border-gray-200"
        />
        <p class="text-xs text-gray-500 mt-2">{{ modelValue }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'MediaPicker',
  props: {
    modelValue: {
      type: String as () => string | null,
      default: null,
    },
    label: {
      type: String,
      default: 'Select Image',
    },
    placeholder: {
      type: String,
      default: 'No image selected',
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const inputId = ref(`media-picker-${Math.random().toString(36).substr(2, 9)}`);

    const openMediaPicker = () => {
      // Check if wp.media is available
      if (!window.wp || !window.wp.media) {
        console.error('WordPress media library not available');
        alert('WordPress media library not available. Please ensure you are in the WordPress admin and have permission to manage media.');
        return;
      }

      try {
        // Create a new media frame
        const frame = window.wp.media({
          title: props.label,
          button: {
            text: 'Select Image',
          },
          multiple: false,
          library: {
            type: 'image',
          },
        });

        // Handle image selection
        frame.on('select', () => {
          const selection = frame.state().get('selection');
          if (selection && selection.length > 0) {
            const attachment = selection.first().toJSON();
            if (attachment?.url) {
              emit('update:modelValue', attachment.url);
            }
          }
        });

        // Open the media picker
        frame.open();
      } catch (error) {
        console.error('Failed to open media picker:', error);
        alert('Failed to open media picker. Please try again.');
      }
    };

    const clearImage = () => {
      emit('update:modelValue', null);
    };

    return {
      inputId,
      openMediaPicker,
      clearImage,
    };
  },
});
</script>

<style scoped>
.media-picker {
  /* Component styles are inherited from parent */
}
</style>
