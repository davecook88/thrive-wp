<template>
  <div class="thrive-admin-settings">
    <!-- Success Message -->
    <div v-if="showSuccess" class="wp-admin-card mb-6 bg-green-50 border-green-200">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-green-800">Settings saved successfully!</p>
        </div>
      </div>
    </div>

    <!-- Settings Form -->
    <form @submit.prevent="saveSettings" class="space-y-6">
      <!-- API Configuration -->
      <div class="wp-admin-card">
        <h3 class="text-lg font-medium text-gray-800 mb-4">API Configuration</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
            <input
              v-model="settings.apiUrl"
              type="text"
              readonly
              class="wp-admin-input w-full bg-gray-50"
            >
            <p class="mt-1 text-sm text-gray-500">
              The NestJS API endpoint (configured in Docker)
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
            <input
              v-model.number="settings.itemsPerPage"
              type="number"
              min="5"
              max="100"
              class="wp-admin-input w-full"
            >
            <p class="mt-1 text-sm text-gray-500">
              Number of items to display per page in user lists
            </p>
          </div>
        </div>
      </div>

      <!-- Debug Settings -->
      <div class="wp-admin-card">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Debug Settings</h3>

        <div class="space-y-4">
          <div class="flex items-center">
            <input
              v-model="settings.debugMode"
              type="checkbox"
              id="debug-mode"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            >
            <label for="debug-mode" class="ml-2 block text-sm text-gray-900">
              Enable debug logging for API calls
            </label>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="wp-admin-button-primary disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';

type Settings = {
  apiUrl: string;
  itemsPerPage: number;
  debugMode: boolean;
};

export default defineComponent({
  name: 'Settings',
  setup() {
    const settings = reactive<Settings>({
      apiUrl: 'http://nestjs:3000',
      itemsPerPage: 20,
      debugMode: false
    });
    const saving = ref(false);
    const showSuccess = ref(false);

    const saveSettings = async () => {
      saving.value = true;
      showSuccess.value = false;
      try {
        const response = await fetch(window.thriveAdminBridgeAjax?.ajax_url || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'thrive_admin_save_settings',
            nonce: window.thriveAdminBridgeAjax?.nonce || '',
            settings: JSON.stringify(settings)
          })
        });
        const result = await response.json();
        if (result.success) {
          showSuccess.value = true;
          setTimeout(() => { showSuccess.value = false; }, 3000);
        } else {
          alert('Failed to save settings: ' + (result.data?.message || 'Unknown error'));
        }
      } catch (error: any) {
        alert('Connection failed: ' + error.message);
      } finally {
        saving.value = false;
      }
    };

    return { settings, saving, showSuccess, saveSettings };
  }
});
</script>
