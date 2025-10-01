<template>
  <div class="thrive-admin-dashboard">
    <div class="wp-admin-card mb-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-3">{{ title }}</h2>
      <p class="text-gray-600">{{ description }}</p>
    </div>

    <div class="mb-6">
      <h3 class="text-lg font-medium text-gray-800 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="wp-admin-card">
          <h4 class="text-lg font-medium text-gray-800 mb-2">User Management</h4>
          <p class="text-gray-600 text-sm mb-4">View, search, and manage application users</p>
          <a
            :href="usersPageUrl"
            class="wp-admin-button-primary"
          >
            Manage Users
          </a>
        </div>

        <div class="wp-admin-card">
          <h4 class="text-lg font-medium text-gray-800 mb-2">Settings</h4>
          <p class="text-gray-600 text-sm mb-4">Configure Thrive Admin settings</p>
          <button
            @click="navigateToSettings"
            class="wp-admin-button-secondary"
          >
            Configure Settings
          </button>
        </div>

        <div class="wp-admin-card">
          <h4 class="text-lg font-medium text-gray-800 mb-2">API Status</h4>
          <p class="text-gray-600 text-sm mb-4">Check the connection to the NestJS API</p>
          <button
            @click="testApiConnection"
            :disabled="testingApi"
            class="wp-admin-button-secondary disabled:opacity-50"
          >
            {{ testingApi ? 'Testing...' : 'Test Connection' }}
          </button>
        </div>
      </div>
    </div>

    <!-- API Test Result -->
    <div v-if="apiTestResult" class="wp-admin-card">
      <h4 class="text-lg font-medium text-gray-800 mb-2">API Test Result</h4>
      <div
        :class="apiTestResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'"
        class="border rounded-md p-4"
      >
        <p>{{ apiTestResult.message }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

type ApiTestResult = { success: boolean; message: string } | null;

export default defineComponent({
  name: 'Dashboard',
  props: {
    title: {
      type: String,
      default: 'Welcome to Thrive Admin'
    },
    description: {
      type: String,
      default: 'Manage your Thrive application users, settings, and more from this central dashboard.'
    },
    usersPageUrl: { 
        type: String, 
        default: window.location.origin + '/wp-admin/admin.php?page=thrive-admin-users'
    }

  },
  setup(props:  { usersPageUrl: string }) {
    const testingApi = ref(false);
    const apiTestResult = ref<ApiTestResult>(null);



    const navigateToSettings = () => {
      window.location.href = (window.thriveAdminBridgeAjax?.admin_url || '') + '?page=thrive-admin-settings';
    };

    const navigateToUsers = () => {
      // access the prop from the setup() props parameter
      // props is not reactive-destructured here; using directly is fine for navigation
      window.location.href = (props).usersPageUrl;
    };

    const testApiConnection = async () => {
      testingApi.value = true;
      apiTestResult.value = null;
      try {
        const response = await fetch(window.thriveAdminBridgeAjax?.ajax_url || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'thrive_admin_test_api_connection',
            nonce: window.thriveAdminBridgeAjax?.nonce || ''
          })
        });
        const result = await response.json();
        apiTestResult.value = {
          success: !!result.success,
          message: result.data?.message || result.data || 'Unknown response'
        };
      } catch (error: any) {
        apiTestResult.value = { success: false, message: 'Connection failed: ' + error.message };
      } finally {
        testingApi.value = false;
      }
    };

    return { testingApi, apiTestResult, navigateToUsers, navigateToSettings, testApiConnection };
  }
});
</script>
