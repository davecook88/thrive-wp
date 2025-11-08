<template>
  <div class="text-center py-8">
    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <p class="mt-2 text-gray-600">{{ message }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AssignSessionsLoadingState',
  props: {
    message: {
      type: String,
      default: 'Loading...'
    }
  }
});
</script>