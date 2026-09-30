.PHONY: up down restart logs ps test verify clean

up:
	docker compose up --build --detach --remove-orphans

down:
	docker compose down --remove-orphans

restart: down up

logs:
	docker compose logs --follow --tail 200

ps:
	docker compose ps

test:
	cd backend && mvn -B test
	cd frontend && npm install && npm run build

verify:
	docker compose config --quiet
	cd backend && mvn -B verify
	cd frontend && npm install && npm run build

clean:
	docker compose down --volumes --remove-orphans
