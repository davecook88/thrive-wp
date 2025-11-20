import { createRoot } from "react-dom/client";
import StudentDashboardHero from "./StudentDashboardHero";

const rootElement = document.getElementById("student-dashboard-hero-root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<StudentDashboardHero />);
}
