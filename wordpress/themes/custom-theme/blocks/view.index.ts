// Frontend view entry: import any block view scripts that need to run on the site
import "./teacher-availability/view";
import "./thrive-calendar-context/view";
import "./thrive-calendar/view";
import "./student-calendar/view";
import "./private-session-availability-calendar/view";
import "./selected-event-modal/view";
import "./teacher-picker/view";
// Context-specific logic now lives in ./thrive-calendar-context/view.ts
import "./hooks/get-context";
import "./hooks/get-teachers";
