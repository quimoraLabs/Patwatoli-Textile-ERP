.PHONY: all dev build test docker-up docker-down seed clean

all: dev

dev:
	@echo "Starting Patwatoli Textile ERP via start script..."
	@start.bat

docker-up:
	docker compose up -d

docker-down:
	docker compose down

backend-dev:
	cd backend && go run ./cmd/api

backend-test:
	cd backend && go test -v ./...

backend-seed:
	cd backend && go run ./scripts/seed.go

frontend-dev:
	cd frontend && npm.cmd run dev

frontend-build:
	cd frontend && npm.cmd run build

seed: backend-seed
