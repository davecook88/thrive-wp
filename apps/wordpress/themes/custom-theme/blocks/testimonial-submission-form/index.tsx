import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { TestimonialSubmissionForm } from './components/TestimonialSubmissionForm';

type Attrs = {
  title?: string;
  description?: string;
  showGeneralOption?: boolean;
};

registerBlockType<Attrs>('thrive/testimonial-submission-form', {
  title: __('Testimonial Submission Form', 'custom-theme'),
  category: 'thrive',
  icon: 'edit',
  description: __('Allow students to submit testimonials for teachers or courses', 'custom-theme'),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps();

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__('Form Settings', 'custom-theme')} initialOpen={true}>
            <TextControl
              label={__('Form Title', 'custom-theme')}
              value={attributes.title || 'Share Your Experience'}
              onChange={(value) => setAttributes({ title: value })}
            />

            <TextControl
              label={__('Form Description', 'custom-theme')}
              value={attributes.description || ''}
              onChange={(value) => setAttributes({ description: value })}
              help={__('Optional description shown above the form', 'custom-theme')}
            />

            <ToggleControl
              label={__('Allow General Testimonials', 'custom-theme')}
              checked={attributes.showGeneralOption ?? true}
              onChange={(value) => setAttributes({ showGeneralOption: value })}
              help={__('Allow students to submit general platform testimonials', 'custom-theme')}
            />
          </PanelBody>
        </InspectorControls>

        <div className="editor-preview">
          <TestimonialSubmissionForm
            title={attributes.title || 'Share Your Experience'}
            description={attributes.description || ''}
            showGeneralOption={attributes.showGeneralOption ?? true}
          />
        </div>
      </div>
    );
  },
  save: () => null, // Dynamic block, rendered server-side
});

