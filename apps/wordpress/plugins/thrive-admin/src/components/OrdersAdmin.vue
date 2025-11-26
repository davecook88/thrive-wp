<template>
  <div class="thrive-admin-orders">
    <div class="mb-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-2">Orders & Sales</h2>
      <p class="text-gray-600">View and manage all customer orders and transactions</p>
    </div>

    <!-- Sales Dashboard Metrics -->
    <div v-if="metrics" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm font-medium text-gray-500">Today's Revenue</div>
        <div class="mt-1 text-2xl font-semibold text-gray-900">
          {{ formatCurrency(metrics.todayRevenue, metrics.currency) }}
        </div>
      </div>
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm font-medium text-gray-500">This Week</div>
        <div class="mt-1 text-2xl font-semibold text-gray-900">
          {{ formatCurrency(metrics.weekRevenue, metrics.currency) }}
        </div>
        <div :class="metrics.previousPeriodComparison.weekChange >= 0 ? 'text-green-600' : 'text-red-600'" class="text-sm">
          {{ metrics.previousPeriodComparison.weekChange >= 0 ? '+' : '' }}{{ metrics.previousPeriodComparison.weekChange }}% vs last week
        </div>
      </div>
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm font-medium text-gray-500">This Month</div>
        <div class="mt-1 text-2xl font-semibold text-gray-900">
          {{ formatCurrency(metrics.monthRevenue, metrics.currency) }}
        </div>
        <div :class="metrics.previousPeriodComparison.monthChange >= 0 ? 'text-green-600' : 'text-red-600'" class="text-sm">
          {{ metrics.previousPeriodComparison.monthChange >= 0 ? '+' : '' }}{{ metrics.previousPeriodComparison.monthChange }}% vs last month
        </div>
      </div>
      <div class="bg-white shadow rounded-lg p-4">
        <div class="text-sm font-medium text-gray-500">Active Packages</div>
        <div class="mt-1 text-2xl font-semibold text-gray-900">
          {{ metrics.activeStudentPackages }}
        </div>
        <div class="text-sm text-gray-500">
          {{ metrics.totalBookingsThisMonth }} bookings this month
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'orders'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'orders'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Orders
        </button>
        <button
          @click="activeTab = 'packages'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'packages'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          Student Packages
        </button>
      </nav>
    </div>

    <!-- Orders Tab -->
    <div v-if="activeTab === 'orders'" class="space-y-4">
      <!-- Filters -->
      <div class="bg-white shadow rounded-lg p-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              v-model="orderFilters.search"
              type="text"
              placeholder="Name, email, or order ID"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              @input="debouncedLoadOrders"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              v-model="orderFilters.status"
              @change="loadOrders"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              v-model="orderFilters.dateFrom"
              type="date"
              @change="loadOrders"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              v-model="orderFilters.dateTo"
              type="date"
              @change="loadOrders"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      <div v-if="loadingOrders" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading orders...</p>
      </div>

      <div v-else-if="ordersError" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{{ ordersError }}</p>
      </div>

      <div v-else-if="orders.length === 0" class="text-center py-8 bg-white rounded-lg shadow">
        <p class="text-gray-500">No orders found</p>
      </div>

      <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="order in orders" :key="order.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">#{{ order.id }}</div>
                <div class="text-sm text-gray-500">{{ order.itemCount }} item(s)</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ order.studentName }}</div>
                <div class="text-sm text-gray-500">{{ order.studentEmail }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ formatCurrency(order.totalMinor, order.currency) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(order.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ order.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button @click="viewOrderDetail(order)" class="text-blue-600 hover:text-blue-900">View</button>
                <a
                  v-if="order.stripePaymentIntentId"
                  :href="`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`"
                  target="_blank"
                  class="text-gray-600 hover:text-gray-900"
                >
                  Stripe
                </a>
                <button
                  v-if="order.status === 'paid'"
                  @click="initiateRefund(order)"
                  class="text-red-600 hover:text-red-900"
                >
                  Refund
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div class="flex-1 flex justify-between sm:hidden">
            <button @click="orderFilters.page > 1 && changePage(orderFilters.page - 1)" class="wp-admin-button-secondary">Previous</button>
            <button @click="orderFilters.page < ordersTotalPages && changePage(orderFilters.page + 1)" class="wp-admin-button-secondary">Next</button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing <span class="font-medium">{{ (orderFilters.page - 1) * orderFilters.limit + 1 }}</span> to
                <span class="font-medium">{{ Math.min(orderFilters.page * orderFilters.limit, ordersTotal) }}</span> of
                <span class="font-medium">{{ ordersTotal }}</span> results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="changePage(orderFilters.page - 1)"
                  :disabled="orderFilters.page <= 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  @click="changePage(orderFilters.page + 1)"
                  :disabled="orderFilters.page >= ordersTotalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Packages Tab -->
    <div v-if="activeTab === 'packages'" class="space-y-4">
      <!-- Filters -->
      <div class="bg-white shadow rounded-lg p-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              v-model="packageFilters.search"
              type="text"
              placeholder="Student name, email, or package name"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              @input="debouncedLoadPackages"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              v-model="packageFilters.active"
              @change="loadPackages"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="true">Active Only</option>
              <option value="false">Expired Only</option>
            </select>
          </div>
          <div class="flex items-end">
            <button @click="clearPackageFilters" class="wp-admin-button-secondary">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Packages Table -->
      <div v-if="loadingPackages" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading packages...</p>
      </div>

      <div v-else-if="packagesError" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">{{ packagesError }}</p>
      </div>

      <div v-else-if="packages.length === 0" class="text-center py-8 bg-white rounded-lg shadow">
        <p class="text-gray-500">No packages found</p>
      </div>

      <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchased</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="pkg in packages" :key="pkg.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ pkg.packageName }}</div>
                <div class="text-sm text-gray-500">#{{ pkg.id }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ pkg.studentName }}</div>
                <div class="text-sm text-gray-500">{{ pkg.studentEmail }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ pkg.remainingCredits }} / {{ pkg.totalCredits }}
                </div>
                <div class="text-sm text-gray-500">{{ pkg.usedCredits }} used</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(pkg.purchasedAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ pkg.expiresAt ? formatDate(pkg.expiresAt) : 'Never' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ pkg.isActive ? 'Active' : (pkg.isExpired ? 'Expired' : 'Depleted') }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button @click="showAdjustCreditsModal(pkg)" class="text-blue-600 hover:text-blue-900">
                  Adjust
                </button>
                <button @click="showExtendModal(pkg)" class="text-green-600 hover:text-green-900">
                  Extend
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing <span class="font-medium">{{ (packageFilters.page - 1) * packageFilters.limit + 1 }}</span> to
                <span class="font-medium">{{ Math.min(packageFilters.page * packageFilters.limit, packagesTotal) }}</span> of
                <span class="font-medium">{{ packagesTotal }}</span> results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="changePackagePage(packageFilters.page - 1)"
                  :disabled="packageFilters.page <= 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  @click="changePackagePage(packageFilters.page + 1)"
                  :disabled="packageFilters.page >= packagesTotalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Detail Modal -->
    <div v-if="selectedOrder" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Order #{{ selectedOrder.id }}</h3>
          <button @click="selectedOrder = null" class="text-gray-400 hover:text-gray-500">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">Student</p>
              <p class="text-sm text-gray-900">{{ selectedOrder.studentName }}</p>
              <p class="text-sm text-gray-500">{{ selectedOrder.studentEmail }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Status</p>
              <span :class="getStatusClass(selectedOrder.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                {{ selectedOrder.status }}
              </span>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Date</p>
              <p class="text-sm text-gray-900">{{ formatDate(selectedOrder.createdAt) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Total</p>
              <p class="text-sm font-semibold text-gray-900">{{ formatCurrency(selectedOrder.totalMinor, selectedOrder.currency) }}</p>
            </div>
          </div>

          <div v-if="selectedOrder.items?.length">
            <p class="text-sm font-medium text-gray-500 mb-2">Items</p>
            <div class="border rounded-md divide-y">
              <div v-for="item in selectedOrder.items" :key="item.id" class="px-4 py-3 flex justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ item.title }}</p>
                  <p class="text-sm text-gray-500">{{ item.itemType }} × {{ item.quantity }}</p>
                </div>
                <p class="text-sm font-medium text-gray-900">{{ formatCurrency(item.amountMinor * item.quantity, item.currency) }}</p>
              </div>
            </div>
          </div>

          <div v-if="selectedOrder.stripePaymentIntentId" class="pt-4 border-t">
            <a
              :href="`https://dashboard.stripe.com/payments/${selectedOrder.stripePaymentIntentId}`"
              target="_blank"
              class="text-blue-600 hover:text-blue-800 text-sm"
            >
              View in Stripe Dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Refund Modal -->
    <div v-if="refundOrder" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Refund Order #{{ refundOrder.id }}</h3>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div>
            <p class="text-sm text-gray-600">
              Total: {{ formatCurrency(refundOrder.totalMinor, refundOrder.currency) }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Refund Amount (optional, leave blank for full refund)</label>
            <input
              v-model.number="refundAmount"
              type="number"
              step="0.01"
              min="0"
              :max="refundOrder.totalMinor / 100"
              placeholder="Full refund"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              v-model="refundReason"
              required
              rows="3"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter reason for refund..."
            ></textarea>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button @click="refundOrder = null; refundAmount = null; refundReason = ''" class="wp-admin-button-secondary">
            Cancel
          </button>
          <button
            @click="processRefund"
            :disabled="!refundReason || processingRefund"
            class="wp-admin-button-primary disabled:opacity-50"
          >
            {{ processingRefund ? 'Processing...' : 'Process Refund' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Adjust Credits Modal -->
    <div v-if="adjustPackage" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Adjust Credits</h3>
          <p class="text-sm text-gray-500">{{ adjustPackage.packageName }} - {{ adjustPackage.studentName }}</p>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div>
            <p class="text-sm text-gray-600">
              Current: {{ adjustPackage.remainingCredits }} / {{ adjustPackage.totalCredits }} credits
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Credit Adjustment</label>
            <input
              v-model.number="creditDelta"
              type="number"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 5 to add, -2 to remove"
            />
            <p class="text-sm text-gray-500 mt-1">Use positive numbers to add credits, negative to remove</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              v-model="adjustReason"
              required
              rows="2"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Reason for adjustment..."
            ></textarea>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button @click="adjustPackage = null; creditDelta = 0; adjustReason = ''" class="wp-admin-button-secondary">
            Cancel
          </button>
          <button
            @click="submitCreditAdjustment"
            :disabled="creditDelta === 0 || !adjustReason || processingAdjustment"
            class="wp-admin-button-primary disabled:opacity-50"
          >
            {{ processingAdjustment ? 'Processing...' : 'Adjust Credits' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Extend Package Modal -->
    <div v-if="extendPackage" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Extend Package Expiry</h3>
          <p class="text-sm text-gray-500">{{ extendPackage.packageName }} - {{ extendPackage.studentName }}</p>
        </div>
        <div class="px-6 py-4 space-y-4">
          <div>
            <p class="text-sm text-gray-600">
              Current expiry: {{ extendPackage.expiresAt ? formatDate(extendPackage.expiresAt) : 'Never' }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Expiry Date *</label>
            <input
              v-model="newExpiryDate"
              type="date"
              required
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              v-model="extendReason"
              required
              rows="2"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Reason for extension..."
            ></textarea>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button @click="extendPackage = null; newExpiryDate = ''; extendReason = ''" class="wp-admin-button-secondary">
            Cancel
          </button>
          <button
            @click="submitExtendPackage"
            :disabled="!newExpiryDate || !extendReason || processingExtend"
            class="wp-admin-button-primary disabled:opacity-50"
          >
            {{ processingExtend ? 'Processing...' : 'Extend Package' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { thriveClient } from '@wp-shared/thrive';
import type {
  OrderListItemDto,
  OrderDetailDto,
  SalesDashboardMetricsDto,
  StudentPackageAdminListItemDto,
} from '@thrive/shared';

// Debounce helper
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export default defineComponent({
  name: 'OrdersAdmin',
  setup() {
    // Tab state
    const activeTab = ref<'orders' | 'packages'>('orders');

    // Metrics
    const metrics = ref<SalesDashboardMetricsDto | null>(null);
    const loadingMetrics = ref(false);

    // Orders state
    const orders = ref<OrderListItemDto[]>([]);
    const ordersTotal = ref(0);
    const ordersTotalPages = ref(0);
    const loadingOrders = ref(false);
    const ordersError = ref<string | null>(null);
    const orderFilters = reactive({
      page: 1,
      limit: 20,
      status: '',
      dateFrom: '',
      dateTo: '',
      search: '',
    });

    // Packages state
    const packages = ref<StudentPackageAdminListItemDto[]>([]);
    const packagesTotal = ref(0);
    const packagesTotalPages = ref(0);
    const loadingPackages = ref(false);
    const packagesError = ref<string | null>(null);
    const packageFilters = reactive({
      page: 1,
      limit: 20,
      active: '',
      search: '',
    });

    // Modal states
    const selectedOrder = ref<OrderDetailDto | null>(null);
    const refundOrder = ref<OrderListItemDto | null>(null);
    const refundAmount = ref<number | null>(null);
    const refundReason = ref('');
    const processingRefund = ref(false);

    const adjustPackage = ref<StudentPackageAdminListItemDto | null>(null);
    const creditDelta = ref(0);
    const adjustReason = ref('');
    const processingAdjustment = ref(false);

    const extendPackage = ref<StudentPackageAdminListItemDto | null>(null);
    const newExpiryDate = ref('');
    const extendReason = ref('');
    const processingExtend = ref(false);

    // Load dashboard metrics
    const loadMetrics = async () => {
      loadingMetrics.value = true;
      try {
        metrics.value = await thriveClient.getSalesDashboardMetrics();
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        loadingMetrics.value = false;
      }
    };

    // Load orders
    const loadOrders = async () => {
      loadingOrders.value = true;
      ordersError.value = null;
      try {
        const result = await thriveClient.getAdminOrders({
          page: orderFilters.page,
          limit: orderFilters.limit,
          status: orderFilters.status || undefined,
          dateFrom: orderFilters.dateFrom || undefined,
          dateTo: orderFilters.dateTo || undefined,
          search: orderFilters.search || undefined,
        });
        if (result) {
          orders.value = result.data;
          ordersTotal.value = result.total;
          ordersTotalPages.value = result.totalPages;
        }
      } catch (err) {
        ordersError.value = 'Failed to load orders';
        console.error('Error loading orders:', err);
      } finally {
        loadingOrders.value = false;
      }
    };

    const debouncedLoadOrders = debounce(loadOrders, 300);

    // Load packages
    const loadPackages = async () => {
      loadingPackages.value = true;
      packagesError.value = null;
      try {
        const result = await thriveClient.getAdminStudentPackages({
          page: packageFilters.page,
          limit: packageFilters.limit,
          active: packageFilters.active ? packageFilters.active === 'true' : undefined,
          search: packageFilters.search || undefined,
        });
        if (result) {
          packages.value = result.data;
          packagesTotal.value = result.total;
          packagesTotalPages.value = result.totalPages;
        }
      } catch (err) {
        packagesError.value = 'Failed to load packages';
        console.error('Error loading packages:', err);
      } finally {
        loadingPackages.value = false;
      }
    };

    const debouncedLoadPackages = debounce(loadPackages, 300);

    // Pagination
    const changePage = (page: number) => {
      orderFilters.page = page;
      void loadOrders();
    };

    const changePackagePage = (page: number) => {
      packageFilters.page = page;
      void loadPackages();
    };

    const clearPackageFilters = () => {
      packageFilters.search = '';
      packageFilters.active = '';
      packageFilters.page = 1;
      void loadPackages();
    };

    // View order detail
    const viewOrderDetail = async (order: OrderListItemDto) => {
      try {
        const detail = await thriveClient.getAdminOrder(order.id);
        selectedOrder.value = detail;
      } catch (err) {
        console.error('Error loading order detail:', err);
      }
    };

    // Refund
    const initiateRefund = (order: OrderListItemDto) => {
      refundOrder.value = order;
      refundAmount.value = null;
      refundReason.value = '';
    };

    const processRefund = async () => {
      if (!refundOrder.value || !refundReason.value) return;

      processingRefund.value = true;
      try {
        await thriveClient.refundOrder(refundOrder.value.id, {
          amount: refundAmount.value ? Math.round(refundAmount.value * 100) : undefined,
          reason: refundReason.value,
        });
        refundOrder.value = null;
        refundAmount.value = null;
        refundReason.value = '';
        void loadOrders();
        void loadMetrics();
      } catch (err) {
        console.error('Error processing refund:', err);
        alert('Failed to process refund');
      } finally {
        processingRefund.value = false;
      }
    };

    // Credit adjustment
    const showAdjustCreditsModal = (pkg: StudentPackageAdminListItemDto) => {
      adjustPackage.value = pkg;
      creditDelta.value = 0;
      adjustReason.value = '';
    };

    const submitCreditAdjustment = async () => {
      if (!adjustPackage.value || creditDelta.value === 0 || !adjustReason.value) return;

      processingAdjustment.value = true;
      try {
        await thriveClient.adjustPackageCredits(adjustPackage.value.id, {
          creditDelta: creditDelta.value,
          reason: adjustReason.value,
        });
        adjustPackage.value = null;
        creditDelta.value = 0;
        adjustReason.value = '';
        void loadPackages();
      } catch (err) {
        console.error('Error adjusting credits:', err);
        alert('Failed to adjust credits');
      } finally {
        processingAdjustment.value = false;
      }
    };

    // Extend package
    const showExtendModal = (pkg: StudentPackageAdminListItemDto) => {
      extendPackage.value = pkg;
      newExpiryDate.value = '';
      extendReason.value = '';
    };

    const submitExtendPackage = async () => {
      if (!extendPackage.value || !newExpiryDate.value || !extendReason.value) return;

      processingExtend.value = true;
      try {
        await thriveClient.extendPackage(extendPackage.value.id, {
          newExpiryDate: new Date(newExpiryDate.value).toISOString(),
          reason: extendReason.value,
        });
        extendPackage.value = null;
        newExpiryDate.value = '';
        extendReason.value = '';
        void loadPackages();
      } catch (err) {
        console.error('Error extending package:', err);
        alert('Failed to extend package');
      } finally {
        processingExtend.value = false;
      }
    };

    // Formatters
    const formatCurrency = (amountMinor: number, currency: string): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amountMinor / 100);
    };

    const formatDate = (dateStr: string): string => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const getStatusClass = (status: string): string => {
      switch (status) {
        case 'paid':
          return 'bg-green-100 text-green-800';
        case 'pending':
        case 'requires_payment':
          return 'bg-yellow-100 text-yellow-800';
        case 'refunded':
          return 'bg-blue-100 text-blue-800';
        case 'cancelled':
        case 'failed':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    // Load initial data
    onMounted(() => {
      void loadMetrics();
      void loadOrders();
      void loadPackages();
    });

    return {
      activeTab,
      metrics,
      loadingMetrics,
      orders,
      ordersTotal,
      ordersTotalPages,
      loadingOrders,
      ordersError,
      orderFilters,
      packages,
      packagesTotal,
      packagesTotalPages,
      loadingPackages,
      packagesError,
      packageFilters,
      selectedOrder,
      refundOrder,
      refundAmount,
      refundReason,
      processingRefund,
      adjustPackage,
      creditDelta,
      adjustReason,
      processingAdjustment,
      extendPackage,
      newExpiryDate,
      extendReason,
      processingExtend,
      loadOrders,
      debouncedLoadOrders,
      loadPackages,
      debouncedLoadPackages,
      changePage,
      changePackagePage,
      clearPackageFilters,
      viewOrderDetail,
      initiateRefund,
      processRefund,
      showAdjustCreditsModal,
      submitCreditAdjustment,
      showExtendModal,
      submitExtendPackage,
      formatCurrency,
      formatDate,
      getStatusClass,
    };
  },
});
</script>
