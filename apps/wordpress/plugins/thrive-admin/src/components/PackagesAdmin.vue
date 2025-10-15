<template>
  <div class="thrive-admin-packages">
    <div class="mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-2">Package Management</h2>
      <p class="text-gray-600">Create and manage credit packages for private sessions</p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'list'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'list'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Package List
        </button>
        <button
          @click="activeTab = 'create'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Create New
        </button>
      </nav>
    </div>

    <!-- List Tab -->
    <div v-if="activeTab === 'list'" class="space-y-4">
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading packages...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-else-if="packages.length === 0" class="text-center py-8">
        <p class="text-gray-500">No packages found. Create your first package to get started.</p>
        <button
          @click="activeTab = 'create'"
          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Package
        </button>
      </div>

      <div v-else class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul class="divide-y divide-gray-200">
          <li v-for="pkg in packages" :key="pkg.id" class="px-6 py-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ pkg.name }}</h3>
                <p class="text-sm text-gray-500">
                  {{ pkg.credits }} credits × {{ pkg.creditUnitMinutes }} minutes
                  <span v-if="pkg.expiresInDays"> • Expires in {{ pkg.expiresInDays }} days</span>
                </p>
                <div class="mt-2 flex items-center space-x-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ pkg.serviceType }}
                  </span>
                  <span :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    pkg.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]">
                    {{ pkg.active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <a
                  :href="`https://dashboard.stripe.com/products/${pkg.stripe.productId}`"
                  target="_blank"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View in Stripe
                </a>
                <button
                  v-if="pkg.active"
                  @click="deactivatePackage(pkg)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Create Tab -->
    <div v-if="activeTab === 'create'" class="max-w-2xl">
      <form @submit.prevent="createPackage" class="space-y-6">
        <div class="bg-white shadow px-6 py-6 rounded-lg">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          
          <div class="grid grid-cols-1 gap-6">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700">Package Name</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Private 5-Pack"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                id="description"
                v-model="form.description"
                rows="3"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Internal notes or public description"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="bg-white shadow px-6 py-6 rounded-lg">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Credits Configuration</h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label for="credits" class="block text-sm font-medium text-gray-700">Total Credits</label>
              <input
                id="credits"
                v-model.number="form.credits"
                type="number"
                min="1"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label for="creditUnitMinutes" class="block text-sm font-medium text-gray-700">Credit Unit (Minutes)</label>
              <select
                id="creditUnitMinutes"
                v-model.number="form.creditUnitMinutes"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            <div>
              <label for="expiresInDays" class="block text-sm font-medium text-gray-700">Expires In (Days)</label>
              <input
                id="expiresInDays"
                v-model.number="form.expiresInDays"
                type="number"
                min="1"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Leave blank for no expiry"
              />
            </div>
          </div>
        </div>

        <div class="bg-white shadow px-6 py-6 rounded-lg">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label for="currency" class="block text-sm font-medium text-gray-700">Currency</label>
              <select
                id="currency"
                v-model="form.currency"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="usd">USD</option>
              </select>
            </div>

            <div>
              <label for="amountMinor" class="block text-sm font-medium text-gray-700">Price (cents)</label>
              <input
                id="amountMinor"
                v-model.number="form.amountMinor"
                type="number"
                min="1"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 19900 for $199.00"
              />
              <p class="mt-1 text-sm text-gray-500">Price in cents (e.g., 19900 = $199.00)</p>
            </div>

            <div class="sm:col-span-2">
              <label for="lookupKey" class="block text-sm font-medium text-gray-700">Lookup Key (Optional)</label>
              <input
                id="lookupKey"
                v-model="form.lookupKey"
                type="text"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-generated if left blank"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <button
            type="button"
            @click="resetForm"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            :disabled="creating"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <span v-if="creating" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            {{ creating ? 'Creating...' : 'Create Package' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { thriveClient } from '../lib';
import { CreatePackageDto, PackageResponseDto, ServiceType } from '@thrive/shared';

export default defineComponent({
  name: 'PackagesAdmin',
  setup() {
    const activeTab = ref<'list' | 'create'>('list');
    const packages = ref<PackageResponseDto[]>([]);
    const loading = ref(false);
    const creating = ref(false);
    const error = ref<string | null>(null);

    const form = ref<CreatePackageDto>({
      name: '',
      description: '',
      credits: 5,
      creditUnitMinutes: 30,
      expiresInDays: 90 as number ,
      currency: 'usd',
      amountMinor: 19900,
      lookupKey: '',
      serviceType: ServiceType.PRIVATE,
      scope: ''
    });

    const loadPackages = async () => {
      loading.value = true;
      error.value = null;

      try {
        packages.value = await thriveClient.getPackages();
      } catch (err: any) {
        error.value = err.message || 'Failed to load packages';
      } finally {
        loading.value = false;
      }
    };

    const createPackage = async () => {
      creating.value = true;
      error.value = null;

      try {
        const packageData: CreatePackageDto = {
          ...form.value,
          
          serviceType: ServiceType.PRIVATE
        };

        await thriveClient.createPackage(packageData);

        // Reset form and reload packages
        resetForm();
        await loadPackages();
        activeTab.value = 'list';
      } catch (err: any) {
        error.value = err.message || 'Failed to create package';
      } finally {
        creating.value = false;
      }
    };

    const deactivatePackage = async (pkg: PackageResponseDto) => {
      if (!confirm(`Are you sure you want to deactivate "${pkg.name}"?`)) {
        return;
      }

      try {
        await thriveClient.deactivatePackage(pkg.id);
        await loadPackages();
      } catch (err: any) {
        error.value = err.message || 'Failed to deactivate package';
      }
    };

    const resetForm = () => {
      form.value = {
        name: '',
        description: '',
        credits: 5,
        creditUnitMinutes: 30,
        expiresInDays: 90,
        currency: 'usd',
        amountMinor: 19900,
        lookupKey: '',
        scope:""
      } as CreatePackageDto
    };

    onMounted(loadPackages);

    return {
      activeTab,
      packages,
      loading,
      creating,
      error,
      form,
      loadPackages,
      createPackage,
      deactivatePackage,
      resetForm
    };
  }
});
</script>