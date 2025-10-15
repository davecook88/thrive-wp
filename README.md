# WordPress + Node.js Hybrid Web Application

This project sets up a hybrid web application using WordPress and Node.js, orchestrated with Docker in a `pnpm` monorepo managed by Turborepo.

## Prerequisites

- Docker
- Docker Compose
- `pnpm` (version 9.0.0+)

## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Create a local environment file:**

    Update the values in `.env.local` as needed.

4.  **Build and start the services:**

    ```bash
    docker-compose --env-file .env.local up --build
    ```

## Development

To run all applications in development mode (with hot-reloading), use:

```bash
pnpm dev
```

This command is orchestrated by Turborepo and will start the NestJS API, WordPress, and any other apps in the `apps/` directory.

## Testing

1.  **WordPress Installation:**

    -   Open your web browser and navigate to `http://localhost:8080`.
    -   You should see the WordPress installation screen.
    -   Follow the on-screen instructions to complete the installation.

2.  **Verify the Node.js API:**

    -   Open your web browser and navigate to `http://localhost:8080/api/health`.
    -   You should see the following JSON response:

        ```json
        {
          "status": "ok"
        }
        ```

3.  **Activate the NodeJS Bridge Plugin:**

    -   Log in to your WordPress admin dashboard at `http://localhost:8080/wp-admin`.
    -   Navigate to **Plugins > Installed Plugins**.
    -   Activate the **NodeJS Bridge** plugin.

## Services

-   **Nginx (Reverse Proxy):** `http://localhost:8080`
-   **WordPress:** `http://localhost:8080` (proxied through Nginx)
-   **NestJS API:** `http://localhost:3000` (direct) or `http://localhost:8080/api` (proxied)
-   **MySQL:** Port `3306` (not exposed to the host by default)

## Docs

- Service Types System: `docs/service-types-system.md`
- Reusable Calendar Component Plan: `docs/reusable-calendar-plan.md`
- Gutenberg Calendar Block Guide: `docs/gutenberg-calendar-block.md`
- Thrive Modal Architecture (frontend React modal for blocks): `docs/thrive-modal-architecture.md`
