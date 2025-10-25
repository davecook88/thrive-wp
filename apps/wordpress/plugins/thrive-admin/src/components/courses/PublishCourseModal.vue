<template>
  <div
    v-if="course"
    class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">
            Publish Course to Stripe
          </h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-500"
          >
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-4 space-y-6">
        <!-- Course Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 class="font-medium text-gray-900">{{ course.title }}</h4>
          <p class="text-sm text-gray-600 mt-1">Code: {{ course.code }}</p>
          <p class="text-sm text-gray-600">Steps: {{ course.steps?.length || 0 }}</p>
        </div>

        <!-- Validation Warnings -->
        <div v-if="validationErrors.length > 0" class="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 class="font-medium text-red-800 mb-2">Cannot Publish - Requirements Not Met:</h4>
          <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
            <li v-for="(error, idx) in validationErrors" :key="idx">{{ error }}</li>
          </ul>
        </div>

        <!-- Price Input -->
        <div>
          <label for="price" class="block text-sm font-medium text-gray-700 mb-2">
            Course Price *
          </label>
          <div class="relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              id="price"
              v-model="priceInDollars"
              type="number"
              step="0.01"
              min="0.01"
              required
              class="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span class="text-gray-500 sm:text-sm">USD</span>
            </div>
          </div>
          <p class="mt-1 text-xs text-gray-500">
            This will create a Stripe product and price for this course
          </p>
        </div>

        <!-- Information -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h4 class="font-medium text-yellow-800 mb-2">Important:</h4>
          <ul class="text-sm text-yellow-700 space-y-1">
            <li>• Publishing creates a product in your Stripe account</li>
            <li>• Students will be able to purchase this course once published</li>
            <li>• You can update the price later in Stripe if needed</li>
            <li>• This action cannot be easily undone</li>
          </ul>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          :disabled="publishing"
        >
          Cancel
        </button>
        <button
          @click="handlePublish"
          type="button"
          :disabled="publishing || validationErrors.length > 0 || !priceInDollars || priceInDollars <= 0"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ publishing ? 'Publishing...' : 'Publish to Stripe' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, type PropType } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type { CourseProgramDetailDto } from '@thrive/shared';

export default defineComponent({
  name: 'PublishCourseModal',
  props: {
    course: {
      type: Object as PropType<CourseProgramDetailDto | null>,
      default: null
    }
  },
  emits: ['close', 'published'],
  setup(props, { emit }) {
    const priceInDollars = ref<number>(0);
    const publishing = ref(false);
    const error = ref<string | null>(null);

    // Validation
    const validationErrors = computed(() => {
      const errors: string[] = [];

      if (!props.course) return errors;

      const steps = props.course.steps || [];

      if (steps.length === 0) {
        errors.push('Course must have at least one step');
      }

      const stepsWithOptions = steps.filter(step =>
        step.options && step.options.length > 0
      );

      if (stepsWithOptions.length === 0) {
        errors.push('Course must have at least one step with class options');
      }

      return errors;
    });

    // Watch for course changes and set initial price
    watch(() => props.course, (newCourse) => {
      if (newCourse?.priceInCents) {
        priceInDollars.value = newCourse.priceInCents / 100;
      } else {
        priceInDollars.value = 0;
      }
      error.value = null;
    }, { immediate: true });

    const handlePublish = async () => {
      if (!props.course) return;

      if (validationErrors.value.length > 0) {
        error.value = 'Please fix validation errors before publishing';
        return;
      }

      if (!priceInDollars.value || priceInDollars.value <= 0) {
        error.value = 'Please enter a valid price';
        return;
      }

      publishing.value = true;
      error.value = null;

      try {
        const priceInCents = Math.round(priceInDollars.value * 100);

        await thriveClient.publishCourseToStripe(props.course.id, {
          priceInCents,
          currency: 'usd',
        });

        emit('published');
        emit('close');
      } catch (err: any) {
        error.value = err.message || 'Failed to publish course to Stripe';
      } finally {
        publishing.value = false;
      }
    };

    return {
      priceInDollars,
      publishing,
      error,
      validationErrors,
      handlePublish
    };
  }
});
</script>
