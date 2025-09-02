import { SelectControl as WPSelectControl } from "@wordpress/components";

interface CustomSelectControlProps {
  label?: string;
  value?: string; // Allow array for multiple selections
  options?: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void; // Allow array for multiple selections
  help?: string;
  className?: string;
  accentColor?: string;
  [key: string]: any;
}

export default function CustomSelectControl({
  accentColor,
  className = "",
  ...props
}: CustomSelectControlProps) {
  const combinedClassName = `custom-select-control-wrapper ${className}`.trim();

  return (
    <>
      <div className={combinedClassName} style={{ width: "100%" }}>
        <WPSelectControl {...props} />
      </div>
    </>
  );
}
