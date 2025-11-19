import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { MaterialQuestion } from "./material-question.entity.js";
import { User } from "../../users/entities/user.entity.js";

@Entity("student_answer")
@Index(["questionId", "studentId"], { unique: true })
@Index(["assessedById"])
export class StudentAnswer extends BaseEntity {
  @Column({ name: "question_id", type: "int", comment: "FK to material_question.id" })
  questionId: number;

  @ManyToOne(() => MaterialQuestion, { onDelete: "CASCADE" })
  @JoinColumn({ name: "question_id" })
  question: MaterialQuestion;

  @Column({ name: "student_id", type: "int", comment: "FK to user.id (student)" })
  studentId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student: User;

  @Column({ name: "answer_content", type: "text", comment: "The student's answer (text, or URL to uploaded file/video)" })
  answerContent: string;

  @Column({
    name: "status",
    type: "enum",
    enum: ["pending_assessment", "approved", "needs_revision"],
    default: "pending_assessment",
    comment: "Status of the answer assessment",
  })
  status: "pending_assessment" | "approved" | "needs_revision";

  @Column({ name: "assessed_by_id", type: "int", nullable: true, comment: "FK to user.id (teacher who assessed it)" })
  assessedById: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "assessed_by_id" })
  assessedBy: User | null;

  @Column({ name: "feedback", type: "text", nullable: true, comment: "Teacher's feedback on the answer" })
  feedback: string | null;
}
