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
	docker compose config --quiet

quality:
	bash scripts/quality/check-structure.sh
	git diff --check

test:
	cd backend && mvn -B --no-transfer-progress test
	cd frontend && npm ci --ignore-scripts && npm run check

verify: quality
	cd backend && mvn -B --no-transfer-progress verify
	cd frontend && npm ci --ignore-scripts && npm run check

smoke:
	./start.sh --no-browser
	curl --fail http://localhost:5173/api/v1/health

reset:
	./stop.sh --volumes
