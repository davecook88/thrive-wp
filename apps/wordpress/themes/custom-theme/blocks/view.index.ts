// Frontend view entry: import any block view scripts that need to run on the site
import "./teacher-availability/view";
import "./teacher-profile-form/view";
import "./student-calendar/view";
import "./student-class-credits/view";
import "./private-session-availability-calendar/view";
import "./selected-event-modal/view";
// import "./teacher-picker/view"; // Removed - block deleted
import "./booking-session-details/view";
import "./conditional-stripe-payment/view";
import "./student-package-details/view";
import "./student-upcoming-sessions/view";
import "./student-course-enrollments/view";
import "./student-stats-widget/view";
import "./teacher-stats-widget/view";
import "./teacher-info/view";
import "./teacher-calendar/view";
// Context-specific logic now lives in ./thrive-calendar-context/view.ts
import "./hooks/get-context";
import "./hooks/get-teachers";
