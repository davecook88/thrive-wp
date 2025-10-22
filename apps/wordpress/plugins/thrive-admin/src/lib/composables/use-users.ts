import { ref, computed, reactive } from "vue";
import { UserUtils, type UserResponse } from "../index";
import { thriveClient } from "@wp-shared/thrive";

export interface UseUsersOptions {
  initialPage?: number;
  initialSearch?: string;
  initialRole?: string;
  pageSize?: number;
}

export function useUsers(options: UseUsersOptions = {}) {
  const {
    initialPage = 1,
    initialSearch = "",
    initialRole = "",
    pageSize = 20,
  } = options;

  // State
  const users = ref<UserResponse[]>([]);
  const total = ref(0);
  const totalPages = ref(0);
  const currentPage = ref(initialPage);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Filters
  const filters = reactive<{
    search: string;
    role: string;
  }>({
    search: initialSearch,
    role: initialRole,
  });

  // Computed
  const hasFilters = computed(() => !!(filters.search || filters.role));
  const visiblePages = computed(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage.value - 2);
    const end = Math.min(totalPages.value, currentPage.value + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  // Methods
  const loadUsers = async () => {
    loading.value = true;
    error.value = null;

    try {
      const data = await thriveClient.getUsers(
        currentPage.value,
        pageSize,
        filters.search,
        filters.role,
      );

      if (data) {
        users.value = data.users;
        total.value = data.total;
        totalPages.value = data.totalPages;
      } else {
        error.value = "Failed to load users";
        users.value = [];
        total.value = 0;
        totalPages.value = 0;
      }
    } catch (err) {
      console.error("Error loading users:", err);
      error.value = "An error occurred while loading users";
      users.value = [];
      total.value = 0;
      totalPages.value = 0;
    } finally {
      loading.value = false;
    }
  };

  const handleFilter = () => {
    currentPage.value = 1;
    loadUsers().catch((err) => {
      console.error("Error applying filters:", err);
    });
  };

  const clearFilters = () => {
    filters.search = "";
    filters.role = "";
    currentPage.value = 1;
    void loadUsers();
  };

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
      void loadUsers();
    }
  };

  const refresh = () => loadUsers();

  // User management methods
  const promoteToAdmin = async (userId: number) => {
    try {
      await thriveClient.promoteToAdmin(userId);
      await refresh(); // Refresh the list to show updated roles
    } catch (err: unknown) {
      console.error("Error promoting user to admin:", err);
      throw err;
    }
  };

  const demoteFromAdmin = async (userId: number) => {
    try {
      await thriveClient.demoteFromAdmin(userId);
      await refresh(); // Refresh the list to show updated roles
    } catch (err: unknown) {
      console.error("Error demoting user from admin:", err);
      throw err;
    }
  };

  const promoteToTeacher = async (userId: number, tier: number = 10) => {
    try {
      await thriveClient.promoteToTeacher(userId, tier);
      await refresh(); // Refresh the list to show updated roles
    } catch (err: unknown) {
      console.error("Error promoting user to teacher:", err);
      throw err;
    }
  };

  const updateTeacherTier = async (userId: number, tier: number) => {
    try {
      await thriveClient.updateTeacherTier(userId, tier);
      await refresh(); // Refresh the list to show updated roles
    } catch (err: unknown) {
      console.error("Error updating teacher tier:", err);
      throw err;
    }
  };

  // User utility methods
  const getUserName = (user: UserResponse) => UserUtils.getDisplayName(user);
  const getUserRole = (user: UserResponse) => UserUtils.getRoleDisplay(user);
  const getUserStatus = (user: UserResponse) =>
    UserUtils.getStatusDisplay(user);
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString();

  return {
    // State
    users,
    total,
    totalPages,
    currentPage,
    loading,
    error,
    filters,
    hasFilters,
    visiblePages,

    // Methods
    loadUsers,
    handleFilter,
    clearFilters,
    changePage,
    refresh,
    promoteToAdmin,
    demoteFromAdmin,
    promoteToTeacher,
    updateTeacherTier,

    // Utilities
    getUserName,
    getUserRole,
    getUserStatus,
    formatDate,
  };
}
