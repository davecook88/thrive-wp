import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { User } from "../../users/entities/user.entity.js";
import { Session } from "../../sessions/entities/session.entity.js";
import type { CourseTeacher } from "../../course-teachers/entities/course-teacher.entity.js";
import { TeacherAvailability } from "./teacher-availability.entity.js";
import type { PublicTeacherDto } from "@thrive/shared";

/**
 * Location information for teacher (birthplace or current location)
 */
export interface TeacherLocation {
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

/**
 * Teacher entity represents extended profile & configuration for a user who can teach.
 * A user may have at most one teacher record (one-to-one). Soft deletes supported.
 */
@Entity("teacher")
@Index(["userId"], { unique: true })
@Index(["tier"])
export class Teacher extends BaseEntity {
  @Column({
    name: "user_id",
    type: "int",
    comment: "FK to user.id (unique 1:1 with user)",
  })
  userId: number;

  @OneToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    name: "tier",
    type: "smallint",
    unsigned: true,
    default: 10,
    comment: "Teacher tier (10,20,30...) used for pricing & access control",
  })
  tier: number;

  @Column({
    name: "bio",
    type: "text",
    nullable: true,
    comment: "Public biography / profile information",
  })
  bio: string | null;

  @Column({
    name: "is_active",
    type: "tinyint",
    width: 1,
    default: () => "1",
    comment: "Whether the teacher is active & selectable for scheduling",
  })
  isActive: boolean;

  @Column({
    name: "avatar_url",
    type: "varchar",
    length: 500,
    nullable: true,
    comment: "URL to teacher profile picture",
  })
  avatarUrl: string | null;

  @Column({
    name: "birthplace",
    type: "text",
    nullable: true,
    comment: "JSON object with city, country, lat, lng for birthplace",
    transformer: {
      to: (value: TeacherLocation | null) =>
        value ? JSON.stringify(value) : null,
      from: (value: string | null) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as TeacherLocation;
        } catch {
          return null;
        }
      },
    },
  })
  birthplace: TeacherLocation | null;

  @Column({
    name: "current_location",
    type: "text",
    nullable: true,
    comment: "JSON object with city, country, lat, lng for current location",
    transformer: {
      to: (value: TeacherLocation | null) =>
        value ? JSON.stringify(value) : null,
      from: (value: string | null) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as TeacherLocation;
        } catch {
          return null;
        }
      },
    },
  })
  currentLocation: TeacherLocation | null;

  @Column({
    name: "specialties",
    type: "text",
    nullable: true,
    comment: "JSON array of teaching specialties",
    transformer: {
      to: (value: string[] | null) => (value ? JSON.stringify(value) : null),
      from: (value: string | null) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as string[];
        } catch {
          return null;
        }
      },
    },
  })
  specialties: string[] | null;

  @Column({
    name: "years_experience",
    type: "smallint",
    unsigned: true,
    nullable: true,
    comment: "Years of teaching experience",
  })
  yearsExperience: number | null;

  @Column({
    name: "languages_spoken",
    type: "text",
    nullable: true,
    comment: "JSON array of languages spoken",
    transformer: {
      to: (value: string[] | null) => (value ? JSON.stringify(value) : null),
      from: (value: string | null) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as string[];
        } catch {
          return null;
        }
      },
    },
  })
  languagesSpoken: string[] | null;

  @OneToMany(
    () => TeacherAvailability,
    (avail: TeacherAvailability) => avail.teacher,
  )
  availability: TeacherAvailability[];

  @OneToMany(() => Session, "teacher")
  sessions: Session[];

  @OneToMany("CourseTeacher", "teacher")
  courseTeachers: CourseTeacher[];

  /**
   * Convert Teacher entity to PublicTeacherDto
   * This is the single source of truth for teacher DTO transformation
   */
  toPublicDto(): PublicTeacherDto {
    const firstName = this.user?.firstName ?? "";
    const lastName = this.user?.lastName ?? "";

    return {
      id: this.id,
      userId: this.userId,
      bio: this.bio ?? undefined,
      avatarUrl: this.avatarUrl ?? undefined,
      languagesSpoken: this.languagesSpoken ?? undefined,
      birthplace: this.birthplace ?? {},
      currentLocation: this.currentLocation ?? {},
      specialties: this.specialties ?? undefined,
      displayName:
        [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
        "Teacher",
      initials: [firstName.charAt(0), lastName.charAt(0)]
        .filter(Boolean)
        .join("")
        .toUpperCase(),
      isActive: this.isActive ? true : false,
      yearsExperience: this.yearsExperience ?? null,
      levels: undefined,
      rating: undefined,
    };
  }
}
