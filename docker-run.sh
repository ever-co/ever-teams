#!/bin/bash

# ==============================================================================
# DOCKER MANAGEMENT SCRIPT FOR EVER TEAMS WEB
# ==============================================================================
# This script allows easy management of Docker containers in production
# and development modes.
#
# Usage: ./docker-run.sh [command] [options]
#
# Available commands:
#   PRODUCTION:
#     build       - Build Docker image (production)
#     start       - Start application (production)
#     restart     - Restart application (production)
#     logs        - Show production logs
#
#   DEVELOPMENT:
#     dev         - Run in development mode with hot reload
#     dev:build   - Build development image
#     dev:logs    - Show development logs
#
#   GLOBAL (dev + prod):
#     stop        - Stop ALL containers (dev + prod)
#     clean       - Remove ALL containers and images (dev + prod)
#     help        - Show help
#
# ==============================================================================

set -e

# Colors for messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Production configuration
COMPOSE_FILE_PROD="docker-compose.build.yml"
ENV_FILE_PROD=".env.docker"
CONTAINER_NAME_PROD="webapp"

# Development configuration
COMPOSE_FILE_DEV="docker-compose.dev.yml"
ENV_FILE_DEV=".env.dev.docker"
CONTAINER_NAME_DEV="webapp-dev"

# Function to display messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Install Docker Desktop first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Install Docker Desktop first."
        exit 1
    fi

    print_success "Docker and Docker Compose are installed"
}

# Function to check if .env.docker file exists
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        print_error "File $ENV_FILE does not exist."
        exit 1
    fi
    print_success "File $ENV_FILE found"
}

# ==============================================================================
# PRODUCTION MODE FUNCTIONS
# ==============================================================================

# Function to build production image
build() {
    print_info "Building Docker image (PRODUCTION)..."
    docker-compose -f "$COMPOSE_FILE_PROD" --env-file "$ENV_FILE_PROD" build
    print_success "Production image built successfully"
}

# Function to start application in production
start() {
    print_info "Starting application (PRODUCTION)..."
    docker-compose -f "$COMPOSE_FILE_PROD" --env-file "$ENV_FILE_PROD" up -d
    print_success "Application started in production mode"
    print_info "Access the application at: http://localhost:3030"
    print_info "To view logs: ./docker-run.sh logs"
}

# Function to stop ALL containers (dev AND prod)
stop() {
    print_info "Stopping all containers (dev + prod)..."

    # Stop production container
    docker-compose -f "$COMPOSE_FILE_PROD" down 2>/dev/null || true

    # Stop development container
    docker-compose -f "$COMPOSE_FILE_DEV" down 2>/dev/null || true

    print_success "All containers stopped"
}

# Function to restart application
restart() {
    print_info "Restarting application..."
    stop
    start
}

# Function to show logs
logs() {
    print_info "Showing logs (Ctrl+C to quit)..."
    docker logs -f "$CONTAINER_NAME_PROD"
}

# ==============================================================================
# DEVELOPMENT MODE FUNCTIONS
# ==============================================================================

# Function to build development image
dev_build() {
    print_info "Building Docker image (DEVELOPMENT)..."
    docker-compose -f "$COMPOSE_FILE_DEV" --env-file "$ENV_FILE_DEV" build
    print_success "Development image built successfully"
}

# Function to start application in development mode
dev() {
    print_info "Starting application (DEVELOPMENT with HOT RELOAD)..."
    print_warning "First startup may take a few minutes..."
    docker-compose -f "$COMPOSE_FILE_DEV" --env-file "$ENV_FILE_DEV" up
    # Note: We don't use -d to see logs in real-time
}

# Function to show development container logs
dev_logs() {
    print_info "Showing development logs (Ctrl+C to quit)..."
    docker logs -f "$CONTAINER_NAME_DEV"
}

# ==============================================================================
# CLEANUP FUNCTION
# ==============================================================================

# Function to clean ALL containers and images (dev AND prod)
clean() {
    print_warning "This action will remove ALL containers and images (dev + prod). Continue? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning all containers and images..."

        # Stop and remove containers
        docker-compose -f "$COMPOSE_FILE_PROD" down 2>/dev/null || true
        docker-compose -f "$COMPOSE_FILE_DEV" down 2>/dev/null || true

        # Remove images
        docker rmi ever-teams-webapp:latest 2>/dev/null || true
        docker rmi ever-teams-webapp:dev 2>/dev/null || true

        print_success "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
}

# ==============================================================================
# HELP FUNCTION
# ==============================================================================

# Function to display help
show_help() {
    echo ""
    echo "Docker Management Script for Ever Teams Web"
    echo ""
    echo "Usage: ./docker-run.sh [command]"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "PRODUCTION COMMANDS (optimized image, no hot reload)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  build      - Build production Docker image"
    echo "  start      - Start application in production (background)"
    echo "  restart    - Restart application in production"
    echo "  logs       - Show production logs in real-time"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "DEVELOPMENT COMMANDS (hot reload enabled)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  dev        - Run in development mode with hot reload"
    echo "  dev:build  - Build development image"
    echo "  dev:logs   - Show development logs"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "GLOBAL COMMANDS (affect dev AND prod)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  stop       - Stop ALL containers (dev + prod)"
    echo "  clean      - Remove ALL containers and images (dev + prod)"
    echo "  help       - Show this help"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "USAGE EXAMPLES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Production Mode:"
    echo "    ./docker-run.sh build      # Build production image"
    echo "    ./docker-run.sh start      # Start in production (background)"
    echo "    ./docker-run.sh logs       # View production logs in real-time"
    echo "    ./docker-run.sh restart    # Restart application"
    echo "    ./docker-run.sh stop       # Stop ALL (dev + prod)"
    echo ""
    echo "  Development Mode (recommended for coding):"
    echo "    ./docker-run.sh dev:build  # Build dev image (once)"
    echo "    ./docker-run.sh dev        # Run with hot reload (logs in real-time)"
    echo "                               # Edit your code, it reloads automatically!"
    echo "    ./docker-run.sh dev:logs   # View dev logs (if running in background)"
    echo "    ./docker-run.sh stop       # Stop ALL (dev + prod)"
    echo ""
    echo "  Complete Cleanup:"
    echo "    ./docker-run.sh stop       # Stop all containers"
    echo "    ./docker-run.sh clean      # Remove all images"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# ==============================================================================
# MAIN FUNCTION
# ==============================================================================

# Main function
main() {
    # Check Docker
    check_docker

    # Process command
    case "${1:-help}" in
        # Production commands
        build)
            ENV_FILE="$ENV_FILE_PROD"
            check_env_file
            build
            ;;
        start)
            ENV_FILE="$ENV_FILE_PROD"
            check_env_file
            start
            ;;
        stop)
            stop
            ;;
        restart)
            ENV_FILE="$ENV_FILE_PROD"
            check_env_file
            restart
            ;;
        logs)
            logs
            ;;
        clean)
            clean
            ;;

        # Development commands
        dev)
            print_info "DEVELOPMENT MODE with HOT RELOAD"
            dev
            ;;
        dev:build)
            dev_build
            ;;
        dev:logs)
            dev_logs
            ;;

        # Help
        help|--help|-h)
            show_help
            ;;

        # Unknown command
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run the script
main "$@"
