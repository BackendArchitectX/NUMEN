package ai.numen.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClaimEquivalenceTest {
    @Test
    void groupsConservativelyEquivalentSpringBootPurposeClaims() {
        assertThat(ClaimEquivalence.equivalent(
                "Spring Boot helps you to create stand-alone, production-grade Spring-based applications that you can run.",
                "Spring Boot :: Spring Boot",
                "Spring Boot helps you to create Spring-powered, production-grade applications and services with absolute minimum fuss.",
                "Spring Boot"
        )).isTrue();
    }

    @Test
    void groupsEquivalentUseCaseWording() {
        assertThat(ClaimEquivalence.equivalent(
                "You can use Spring Boot to create Java applications that can be started by using java -jar or more traditional WAR deployments.",
                "Spring Boot",
                "You can use Spring Boot to create stand-alone Java applications that can be started using java -jar or more traditional WAR deployments.",
                "Spring Boot"
        )).isTrue();
    }

    @Test
    void refusesOppositePolarity() {
        assertThat(ClaimEquivalence.equivalent(
                "Spring Boot supports XML configuration for application setup.",
                "Spring Boot",
                "Spring Boot does not support XML configuration for application setup.",
                "Spring Boot"
        )).isFalse();
    }

    @Test
    void refusesDifferentNumericFacts() {
        assertThat(ClaimEquivalence.equivalent(
                "The runtime requires Java 17 for supported production deployments.",
                "Runtime Guide",
                "The runtime requires Java 21 for supported production deployments.",
                "Runtime Guide"
        )).isFalse();
    }

    @Test
    void refusesDifferentSubjectsEvenWhenSentenceShapeMatches() {
        assertThat(ClaimEquivalence.equivalent(
                "Kafka provides durable messaging with consumer groups and delivery guarantees.",
                "Kafka",
                "RabbitMQ provides durable messaging with consumer groups and delivery guarantees.",
                "RabbitMQ"
        )).isFalse();
    }

    @Test
    void appliesStricterMatchingToFeatureLists() {
        assertThat(ClaimEquivalence.equivalent(
                "The platform provides embedded servers, security, metrics, health checks, and tracing.",
                "Platform",
                "The platform provides embedded servers, security, metrics, health checks, and scheduling.",
                "Platform"
        )).isFalse();
    }

    @Test
    void refusesLowInformationFuzzyMatches() {
        assertThat(ClaimEquivalence.equivalent(
                "Supports REST APIs.",
                "Platform",
                "Supports GraphQL APIs.",
                "Platform"
        )).isFalse();
    }

    @Test
    void detectsNumericDisagreementOnlyWhenTheTopicMatches() {
        assertThat(ClaimEquivalence.disagreementReason(
                "The runtime requires Java 17 for supported production deployments.",
                "Runtime Guide",
                "The runtime requires Java 21 for supported production deployments.",
                "Runtime Guide"
        )).contains(ClaimEquivalence.DisagreementReason.NUMERIC_CONFLICT);

        assertThat(ClaimEquivalence.disagreementReason(
                "The runtime requires Java 17 for supported production deployments.",
                "Runtime Guide",
                "The service retains logs for 21 days in production.",
                "Operations Guide"
        )).isEmpty();
    }

    @Test
    void detectsPolarityDisagreement() {
        assertThat(ClaimEquivalence.disagreementReason(
                "Spring Boot supports XML configuration for application setup.",
                "Spring Boot",
                "Spring Boot does not support XML configuration for application setup.",
                "Spring Boot"
        )).contains(ClaimEquivalence.DisagreementReason.POLARITY_CONFLICT);
    }

    @Test
    void detectsRequiredVersusOptionalDisagreement() {
        assertThat(ClaimEquivalence.disagreementReason(
                "TLS configuration is required for production connections.",
                "Connection Security",
                "TLS configuration is optional for production connections.",
                "Connection Security"
        )).contains(ClaimEquivalence.DisagreementReason.REQUIREMENT_CONFLICT);
    }

    @Test
    void doesNotFlagAddedDetailAsDisagreement() {
        assertThat(ClaimEquivalence.disagreementReason(
                "The runtime supports Java for production deployments.",
                "Runtime Guide",
                "The runtime supports Java 21 for production deployments.",
                "Runtime Guide"
        )).isEmpty();
    }

    @Test
    void doesNotTreatDifferentExplicitProductVersionsAsSourceDisagreement() {
        assertThat(ClaimEquivalence.disagreementReason(
                "Spring Boot 3.5.16 requires at least Java 17 and is compatible with versions up to and including Java 25. Spring Framework 6.2.19 or above is also required. You can also deploy Spring Boot applications to any servlet 5.0+ compatible container.",
                "System Requirements :: Spring Boot",
                "Spring Boot 4.0.8 requires at least Java 17 and is compatible with versions up to and including Java 26. Spring Framework 7.0.9 or above is also required. You can also deploy Spring Boot applications to any Servlet 6.1+ compatible container.",
                "System Requirements :: Spring Boot"
        )).isEmpty();
    }

    @Test
    void detectsSameScopeNumericConflictInsideLongMultiNumberEvidence() {
        assertThat(ClaimEquivalence.disagreementReason(
                "Acme Runtime 2.0 requires at least Java 17 and is compatible with versions up to and including Java 25. Protocol 1.2 is also required for production deployments.",
                "Acme Runtime Compatibility",
                "Acme Runtime 2.0 requires at least Java 17 and is compatible with versions up to and including Java 26. Protocol 1.2 is also required for production deployments.",
                "Acme Runtime Compatibility"
        )).contains(ClaimEquivalence.DisagreementReason.NUMERIC_CONFLICT);
    }

    @Test
    void exactNormalizedClaimsStillMergeAcrossDifferentlyNamedSources() {
        assertThat(ClaimEquivalence.equivalent(
                "Build traceable research workflows.",
                "Source A",
                "Build   traceable research workflows.",
                "Source B"
        )).isTrue();
    }
}
