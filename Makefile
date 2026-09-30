.PHONY: start down restart logs ps doctor quality test verify smoke reset

start:
	./start.sh --no-browser

down:
	./stop.sh

restart: down start

logs:
	docker compose logs --follow --tail 200

ps:
	docker compose ps

doctor:
	docker version
	docker compose version
	POSTGRES_PASSWORD=doctor-compose-validation-only docker compose config --quiet

quality:
	bash scripts/quality/check-structure.sh
	bash scripts/quality/check-runtime.sh
	git diff --check

test:
	cd backend && mvn -B --no-transfer-progress test
	cd frontend && npm ci --ignore-scripts && npm run check

verify: quality
	POSTGRES_PASSWORD=verify-compose-validation-only docker compose config --quiet
	cd backend && mvn -B --no-transfer-progress verify
	cd frontend && npm ci --ignore-scripts && npm run check

smoke:
	./start.sh --no-browser
	@WEB_PORT="$$(awk -F= '/^NUMEN_WEB_PORT=/{print $$2; exit}' .env | tr -d '[:space:]')"; \
	WEB_PORT="$${WEB_PORT:-5173}"; \
	curl --fail "http://localhost:$${WEB_PORT}/api/v1/health"
	./start.sh --no-browser --no-build

reset:
	./stop.sh --volumes
