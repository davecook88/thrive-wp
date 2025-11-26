// Frontend view entry: import any block view scripts that need to run on the site
import "./login-auth/view.tsx";
import "./teacher-profile-form/view";
import "./student-calendar/view";
import "./course-materials/view";
import "./student-class-credits/view";
import "./course-list/view";
import "./course-list/style.scss";
import "./course-header/view";
import "./course-cohorts/view";
import "./course-sessions-calendar/view";
import "./course-detail/view";
import "./private-session-availability-calendar/view";
import "./selected-event-modal/view";
// import "./teacher-picker/view"; // Removed - block deleted
import "./booking-session-details/view";
import "./conditional-stripe-payment/view";
import "./student-package-details/view";
import "./student-upcoming-sessions/view";
import "./student-course-enrollments/view";
import "./session-selection-wizard/view";
import "./student-stats-widget/view";
import "./teacher-stats-widget/view";
import "./teacher-info/view";
import "./teacher-calendar/view";
import "./package-selection/view";
import "./testimonials-display/view";
import "./testimonial-form/view";
// Context-specific logic now lives in ./thrive-calendar-context/view.ts
import "./hooks/get-context";
import "./hooks/get-teachers";
import "../src/course-package-detail-view";
