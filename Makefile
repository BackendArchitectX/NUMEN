.PHONY: start up down restart logs ps test verify smoke clean reset

start up:
	./start.sh --no-browser

down:
	./stop.sh

restart: down start

logs:
	docker compose logs --follow --tail 200

ps:
	docker compose ps

test:
	cd backend && mvn -B test
	cd frontend && npm install --no-audit --no-fund && npm run typecheck && npm run build

verify:
	docker compose config --quiet
	bash -n start.sh stop.sh scripts/runtime/start.sh scripts/runtime/stop.sh
	cd backend && mvn -B verify
	cd frontend && npm install --no-audit --no-fund && npm run typecheck && npm run build

smoke:
	./start.sh --no-browser
	curl --fail http://localhost:$${NUMEN_WEB_PORT:-5173}/api/v1/health

clean reset:
	./stop.sh --volumes
