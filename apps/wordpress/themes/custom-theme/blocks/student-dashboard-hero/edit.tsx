import { useBlockProps } from "@wordpress/block-editor";
import StudentDashboardHero from "./StudentDashboardHero";

export default function Edit() {
  const blockProps = useBlockProps();
  return (
    <div {...blockProps}>
      <StudentDashboardHero />
    </div>
  );
}
