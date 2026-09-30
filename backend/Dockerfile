FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl \
    && addgroup -S numen \
    && adduser -S numen -G numen
COPY --from=build /workspace/target/numen-backend-0.1.0.jar /app/app.jar
USER numen
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=75","-XX:+ExitOnOutOfMemoryError","-jar","/app/app.jar"]
