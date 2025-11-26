import { createRoot } from '@wordpress/element';
import { TestimonialSubmissionForm } from './components/TestimonialSubmissionForm';

document.addEventListener('DOMContentLoaded', () => {
  const blocks = document.querySelectorAll('.wp-block-thrive-testimonial-submission-form');

  blocks.forEach((block) => {
    const root = createRoot(block);
    const attributes = JSON.parse(block.getAttribute('data-attributes') || '{}');

    root.render(
      <TestimonialSubmissionForm
        title={attributes.title || 'Share Your Experience'}
        description={attributes.description || ''}
        showGeneralOption={attributes.showGeneralOption !== false}
      />
    );
  });
});
