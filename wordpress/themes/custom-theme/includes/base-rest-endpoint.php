<?php
/**
 * Base REST Endpoint
 *
 * A reusable base class for registering WordPress REST API endpoints.
 * Extend this class and implement the abstract methods to create custom endpoints.
 */

abstract class BaseRestEndpoint
{

    /**
     * The namespace for the REST route (e.g., 'custom-theme/v1').
     *
     * @var string
     */
    protected $namespace;

    /**
     * The route path (e.g., '/modal/render').
     *
     * @var string
     */
    protected $route;

    /**
     * The HTTP methods allowed (e.g., ['GET', 'POST']).
     *
     * @var array
     */
    protected $methods;

    /**
     * Constructor.
     *
     * @param string $namespace
     * @param string $route
     * @param array $methods
     */
    public function __construct($namespace, $route, $methods = ['GET'])
    {
        $this->namespace = $namespace;
        $this->route = $route;
        $this->methods = $methods;
    }

    /**
     * Register the REST route.
     */
    public function register()
    {
        register_rest_route($this->namespace, $this->route, [
            'methods' => $this->methods,
            'callback' => [$this, 'handle_request'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);
    }

    /**
     * Handle the REST request. Must be implemented by subclasses.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    abstract public function handle_request(WP_REST_Request $request);

    /**
     * Check permissions for the request. Default is public; override for auth.
     *
     * @param WP_REST_Request $request
     * @return bool
     */
    public function check_permissions(WP_REST_Request $request)
    {
        return true; // Public by default
    }
}
