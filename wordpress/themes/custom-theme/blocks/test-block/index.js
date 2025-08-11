/**
 * @type {import('@wordpress/blocks')}
 */
const blocks = wp.blocks;
/**
 * @type {import('@wordpress/server-side-render').default}
 */
const ServerSideRender = wp.serverSideRender;

blocks.registerBlockType("thrive/test-block", {
  edit: function (props) {
    return wp.element.createElement(ServerSideRender, {
      block: "thrive/test-block",
      attributes: props.attributes,
    });
  },
  save: function () {
    return null; // Server rendered
  },
});
