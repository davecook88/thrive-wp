# WordPress + Node.js Hybrid Web Application

This project sets up a hybrid web application using WordPress and Node.js, orchestrated with Docker.

## Prerequisites

- Docker
- Docker Compose

## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Create a local environment file:**

    Copy the example environment file to create a local configuration:

    ```bash
    cp .env.example .env.local
    ```

    Update the values in `.env.local` as needed.

3.  **Build and start the services:**

    ```bash
    docker-compose --env-file .env.local up --build
    ```

## Testing

1.  **WordPress Installation:**

    -   Open your web browser and navigate to `http://localhost`.
    -   You should see the WordPress installation screen.
    -   Follow the on-screen instructions to complete the installation.

2.  **Verify the Node.js API:**

    -   Open your web browser and navigate to `http://localhost/api/health`.
    -   You should see the following JSON response:

        ```json
        {
          "status": "ok"
        }
        ```

3.  **Activate the NodeJS Bridge Plugin:**

    -   Log in to your WordPress admin dashboard at `http://localhost/wp-admin`.
    -   Navigate to **Plugins > Installed Plugins**.
    -   Activate the **NodeJS Bridge** plugin.

## Services

-   **WordPress:** `http://localhost`
-   **Node.js API:** `http://localhost/api`
-   **MySQL:** Port `3306` (not exposed to the host by default)
