# Docker Setup for DevChronicles Dashboard

This document explains how to run the DevChronicles Dashboard using Docker.

## Files Created

- **Dockerfile**: Multi-stage build configuration for the React dashboard
- **.dockerignore**: Excludes unnecessary files from Docker build context
- **docker-compose.yml**: Docker Compose configuration for easy deployment

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up --build

# Start in detached mode (background)
docker-compose up -d --build

# Stop the application
docker-compose down
```

### Using Docker CLI

```bash
# Build the Docker image
docker build -t devchronicles-dashboard .

# Run the container
docker run -p 3000:3000 --name devchronicles-dashboard devchronicles-dashboard

# Run in detached mode
docker run -d -p 3000:3000 --name devchronicles-dashboard devchronicles-dashboard
```

## Access the Application

Once running, access the dashboard at:
- **Main Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Docker Image Details

### Multi-Stage Build
- **Stage 1 (build)**: Installs dependencies and builds the React application
- **Stage 2 (production)**: Creates a lightweight production image with only runtime dependencies

### Security Features
- Runs as non-root user (`nodejs`)
- Only includes production dependencies
- Includes health check endpoint

### Image Size Optimization
- Uses Alpine Linux base image
- Excludes development dependencies
- Uses .dockerignore to exclude unnecessary files

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `3000` | Server port |

## Health Check

The container includes a built-in health check that:
- Checks every 30 seconds
- Has a 3-second timeout
- Allows 3 retries
- Has a 40-second start period

## Development vs Production

- **Development**: Use `npm run dev` for React development server with hot reload
- **Production**: Docker serves the built React app through Express server

## Troubleshooting

### Container won't start
- Check if port 3000 is available: `lsof -i :3000`
- View container logs: `docker logs devchronicles-dashboard`

### Build fails
- Ensure all dependencies are properly listed in package.json
- Check Docker build logs: `docker build -t devchronicles-dashboard . --no-cache`

### Permission issues
- The application runs as non-root user `nodejs` for security
- File permissions are set during build process

## Commands Reference

```bash
# View running containers
docker ps

# View container logs
docker logs devchronicles-dashboard

# Execute commands in running container
docker exec -it devchronicles-dashboard sh

# Remove container
docker rm devchronicles-dashboard

# Remove image
docker rmi devchronicles-dashboard

# Clean up unused Docker resources
docker system prune
```
