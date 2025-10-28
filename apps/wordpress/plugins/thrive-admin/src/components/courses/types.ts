import type { CourseProgramDetailDto } from "@thrive/shared";

export interface CourseForm {
  code: string;
  title: string;
  description: string;
  timezone: string;
  isActive: boolean;
  levelIds: number[];
}

export interface CourseStepForm {
  stepOrder: number;
  label: string;
  title: string;
  description: string;
  isRequired: boolean;
}

export interface CourseAdminState {
  activeTab: "list" | "create" | "edit";
  courses: CourseProgramDetailDto[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  selectedCourse: CourseProgramDetailDto | null;
  editingCourse: CourseProgramDetailDto | null;
}
