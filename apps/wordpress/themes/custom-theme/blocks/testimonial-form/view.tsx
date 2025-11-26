import { createRoot } from "react-dom/client";
import TestimonialForm from "./components/TestimonialForm";

document.addEventListener("DOMContentLoaded", () => {
  const blocks = document.querySelectorAll<HTMLElement>(".testimonial-form-block");

  blocks.forEach((block) => {
    const showMyTestimonials = block.dataset.showMyTestimonials === "true";
    const allowGeneral = block.dataset.allowGeneral === "true";
    const thankYouMessage = block.dataset.thankYouMessage || "Thank you for your testimonial!";

    const root = createRoot(block);
    root.render(
      <TestimonialForm
        showMyTestimonials={showMyTestimonials}
        allowGeneralTestimonials={allowGeneral}
        thankYouMessage={thankYouMessage}
      />
    );
  });
});
