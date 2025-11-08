<template>
  <div class="bg-red-50 border border-red-200 rounded-md p-4">
    <p class="text-red-800">{{ error }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AssignSessionsErrorState',
  props: {
    error: {
      type: String,
      required: true
    }
  }
});
</script>