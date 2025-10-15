import type { UserResponse } from "../types/users";

// Common utility functions for user operations
export class UserUtils {
  /**
   * Get the display name for a user
   */
  static getDisplayName(user: UserResponse): string {
    return `${user.firstName} ${user.lastName}`.trim() || "No name";
  }

  /**
   * Get the role display string for a user
   */
  static getRoleDisplay(user: UserResponse): string {
    if (Boolean(user.admin?.isActive)) return "Admin";
    if (user.teacher?.isActive) return `Teacher (Tier ${user.teacher.tier})`;
    return "Student";
  }

  /**
   * Get the status display for a user
   */
  static getStatusDisplay(user: UserResponse): "Active" | "Inactive" {
    if (user.admin?.isActive)
      return Boolean(user.admin.isActive) ? "Active" : "Inactive";
    if (user.teacher?.isActive)
      return Boolean(user.teacher.isActive) ? "Active" : "Inactive";
    return "Active";
  }

  /**
   * Check if user has admin role
   */
  static isAdmin(user: UserResponse): boolean {
    return Boolean(user.admin?.isActive);
  }

  /**
   * Check if user has teacher role
   */
  static isTeacher(user: UserResponse): boolean {
    return Boolean(user.teacher?.isActive);
  }

  /**
   * Check if user is a student (no special roles)
   */
  static isStudent(user: UserResponse): boolean {
    return !this.isAdmin(user) && !this.isTeacher(user);
  }

  /**
   * Format user creation date for display
   */
  static formatCreatedDate(user: UserResponse): string {
    return new Date(user.createdAt).toLocaleDateString();
  }

  /**
   * Get user avatar initials
   */
  static getInitials(user: UserResponse): string {
    const first = user.firstName.charAt(0).toUpperCase();
    const last = user.lastName.charAt(0).toUpperCase();
    return `${first}${last}`;
  }
}

// Re-export commonly used functions for convenience
export const {
  getDisplayName,
  getRoleDisplay,
  getStatusDisplay,
  isAdmin,
  isTeacher,
  isStudent,
  formatCreatedDate,
  getInitials,
} = UserUtils;
