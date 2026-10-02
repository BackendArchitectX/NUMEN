package ai.numen.service;

import ai.numen.dto.ResearchBriefResponse;
import ai.numen.entity.DatasetRecord;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ResearchBriefServiceTest {
    @Test
    void projectsFacetEvidenceIntoClaimLevelBrief() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord record = record(taskId, "Spring Boot",
                "https://raw.githubusercontent.com/spring-projects/spring-boot/main/README.adoc",
                "raw.githubusercontent.com",
                "Purpose: Spring Boot helps create production-grade Spring applications. " +
                        "Key capabilities: Embedded servers, security, metrics and health checks. " +
                        "Common use cases: Stand-alone Java applications and REST services.", "a");

        ResearchBriefResponse brief = ResearchBriefService.project(taskId, "Research Spring Boot", List.of(record));

        assertThat(brief.status()).isEqualTo("AVAILABLE");
        assertThat(brief.projectionVersion()).isEqualTo(ResearchBriefService.PROJECTION_VERSION);
        assertThat(brief.disagreementCount()).isZero();
        assertThat(brief.disagreements()).isEmpty();
        assertThat(brief.findingCount()).isEqualTo(3);
        assertThat(brief.contributingSources()).isEqualTo(1);
        assertThat(brief.sections()).extracting(ResearchBriefResponse.Section::label)
                .containsExactly("Purpose", "Key capabilities", "Common use cases");
        assertThat(brief.sections().get(0).findings().get(0).citations()).singleElement()
                .satisfies(citation -> {
                    assertThat(citation.recordId()).isEqualTo(record.getId());
                    assertThat(citation.sourceUrl()).isEqualTo(record.getSourceUrl());
                    assertThat(citation.evidenceHash()).isEqualTo(record.getEvidenceHash());
                });
    }

    @Test
    void mergesOnlyIdenticalNormalizedFindingsAcrossSources() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord first = record(taskId, "Source A", "https://a.example/research", "a.example",
                "Purpose: Build traceable research workflows.", "a");
        DatasetRecord second = record(taskId, "Source B", "https://b.example/research", "b.example",
                "Purpose:   Build traceable research workflows.", "b");
        DatasetRecord distinct = record(taskId, "Source C", "https://c.example/research", "c.example",
                "Purpose: Support auditable evidence review.", "c");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId, "Compare the purpose across sources", List.of(first, second, distinct));

        var findings = brief.sections().get(0).findings();
        assertThat(findings).hasSize(2);
        assertThat(findings.get(0).supportingSources()).isEqualTo(2);
        assertThat(findings.get(0).citations()).hasSize(2);
        assertThat(findings.get(1).supportingSources()).isEqualTo(1);
    }

    @Test
    void mergesConservativelyEquivalentFindingsAcrossSpringBootSources() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord docs = record(taskId, "Spring Boot :: Spring Boot", "https://docs.spring.io/spring-boot/", "docs.spring.io",
                "Purpose: Spring Boot helps you to create stand-alone, production-grade Spring-based applications that you can run. " +
                        "Key capabilities: Provide a range of non-functional features that are common to large classes of projects (such as embedded servers, security, metrics, health checks, and externalized configuration). " +
                        "Common use cases: You can use Spring Boot to create Java applications that can be started by using java -jar or more traditional WAR deployments.", "docs");
        DatasetRecord readme = record(taskId, "Spring Boot", "https://raw.githubusercontent.com/spring-projects/spring-boot/main/README.adoc", "raw.githubusercontent.com",
                "Purpose: Spring Boot helps you to create Spring-powered, production-grade applications and services with absolute minimum fuss. " +
                        "Key capabilities: Provide a range of non-functional features common to large classes of projects (for example, embedded servers, security, metrics, health checks, externalized configuration). " +
                        "Common use cases: You can use Spring Boot to create stand-alone Java applications that can be started using java -jar or more traditional WAR deployments.", "readme");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId,
                "Research Spring Boot and summarize its purpose, key capabilities, and common use cases.",
                List.of(docs, readme)
        );

        assertThat(brief.findingCount()).isEqualTo(3);
        assertThat(brief.contributingSources()).isEqualTo(2);
        assertThat(brief.sections()).hasSize(3);
        assertThat(brief.sections())
                .allSatisfy(section -> assertThat(section.findings()).singleElement().satisfies(finding -> {
                    assertThat(finding.supportingSources()).isEqualTo(2);
                    assertThat(finding.citations()).hasSize(2);
                }));
    }

    @Test
    void semanticGroupingIsDeterministicAcrossRecordOrder() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord docs = record(taskId, "Spring Boot", "https://docs.spring.io/spring-boot/", "docs.spring.io",
                "Purpose: Spring Boot helps you to create stand-alone, production-grade Spring-based applications that you can run.", "docs-order");
        DatasetRecord readme = record(taskId, "Spring Boot", "https://raw.githubusercontent.com/spring-projects/spring-boot/main/README.adoc", "raw.githubusercontent.com",
                "Purpose: Spring Boot helps you to create Spring-powered, production-grade applications and services with absolute minimum fuss.", "readme-order");

        ResearchBriefResponse first = ResearchBriefService.project(taskId, "Research Spring Boot", List.of(docs, readme));
        ResearchBriefResponse reversed = ResearchBriefService.project(taskId, "Research Spring Boot", List.of(readme, docs));

        assertThat(reversed.sections()).isEqualTo(first.sections());
    }

    @Test
    void surfacesNumericDisagreementAcrossDistinctSourcesWithoutChoosingAWinner() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord java17 = record(taskId, "Runtime Guide", "https://a.example/runtime", "a.example",
                "The runtime requires Java 17 for supported production deployments.", "java17");
        DatasetRecord java21 = record(taskId, "Runtime Guide", "https://b.example/runtime", "b.example",
                "The runtime requires Java 21 for supported production deployments.", "java21");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId, "Which Java version is required for production?", List.of(java17, java21));

        assertThat(brief.findingCount()).isEqualTo(2);
        assertThat(brief.disagreementCount()).isEqualTo(1);
        assertThat(brief.disagreements()).singleElement().satisfies(disagreement -> {
            assertThat(disagreement.sectionLabel()).isEqualTo("Relevant evidence");
            assertThat(disagreement.reason()).isEqualTo("NUMERIC_CONFLICT");
            assertThat(disagreement.left().text()).contains("Java 17");
            assertThat(disagreement.right().text()).contains("Java 21");
            assertThat(disagreement.left().citations()).singleElement()
                    .extracting(ResearchBriefResponse.Citation::sourceUrl)
                    .isEqualTo("https://a.example/runtime");
            assertThat(disagreement.right().citations()).singleElement()
                    .extracting(ResearchBriefResponse.Citation::sourceUrl)
                    .isEqualTo("https://b.example/runtime");
        });
    }

    @Test
    void doesNotCallTwoClaimsFromTheSameSourceASourceDisagreement() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord first = record(taskId, "Runtime Guide", "https://a.example/runtime", "a.example",
                "The runtime requires Java 17 for supported production deployments.", "same-a");
        DatasetRecord second = record(taskId, "Runtime Guide", "https://a.example/runtime", "a.example",
                "The runtime requires Java 21 for supported production deployments.", "same-b");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId, "Which Java version is required for production?", List.of(first, second));

        assertThat(brief.findingCount()).isEqualTo(2);
        assertThat(brief.disagreementCount()).isZero();
    }

    @Test
    void equivalentMultiSourceFindingsDoNotProduceDisagreement() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord first = record(taskId, "Spring Boot", "https://a.example/spring", "a.example",
                "Purpose: Spring Boot helps create production-grade Spring applications.", "eq-a");
        DatasetRecord second = record(taskId, "Spring Boot", "https://b.example/spring", "b.example",
                "Purpose: Spring Boot helps create production-grade Spring applications.", "eq-b");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId, "Research Spring Boot", List.of(first, second));

        assertThat(brief.findingCount()).isEqualTo(1);
        assertThat(brief.disagreementCount()).isZero();
    }

    @Test
    void surfacesSameScopeLongFormNumericDisagreementAcrossSources() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord java25 = record(taskId, "Acme Runtime Compatibility", "https://a.example/acme-runtime-2", "a.example",
                "Acme Runtime 2.0 requires at least Java 17 and is compatible with versions up to and including Java 25. Protocol 1.2 is also required for production deployments.", "acme25");
        DatasetRecord java26 = record(taskId, "Acme Runtime Compatibility", "https://b.example/acme-runtime-2", "b.example",
                "Acme Runtime 2.0 requires at least Java 17 and is compatible with versions up to and including Java 26. Protocol 1.2 is also required for production deployments.", "acme26");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId, "Compare Acme Runtime 2.0 Java compatibility.", List.of(java25, java26));

        assertThat(brief.findingCount()).isEqualTo(2);
        assertThat(brief.disagreementCount()).isEqualTo(1);
        assertThat(brief.disagreements()).singleElement().satisfies(disagreement -> {
            assertThat(disagreement.reason()).isEqualTo("NUMERIC_CONFLICT");
            assertThat(disagreement.left().text() + " " + disagreement.right().text())
                    .contains("Java 25")
                    .contains("Java 26");
        });
    }

    @Test
    void differentExplicitProductVersionsRemainSeparateWithoutFalseDisagreement() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord boot35 = record(taskId, "System Requirements :: Spring Boot", "https://docs.example/spring-boot/3.5", "docs.example",
                "Spring Boot 3.5.16 requires at least Java 17 and is compatible with versions up to and including Java 25. Spring Framework 6.2.19 or above is also required.", "boot35");
        DatasetRecord boot40 = record(taskId, "System Requirements :: Spring Boot", "https://docs.example/spring-boot/4.0", "docs.example",
                "Spring Boot 4.0.8 requires at least Java 17 and is compatible with versions up to and including Java 26. Spring Framework 7.0.9 or above is also required.", "boot40");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId, "Compare Spring Boot Java compatibility by version.", List.of(boot35, boot40));

        assertThat(brief.findingCount()).isEqualTo(2);
        assertThat(brief.disagreementCount()).isZero();
    }

    @Test
    void preservesUnlabelledEvidenceWithoutInventingFacets() {
        UUID taskId = UUID.randomUUID();
        DatasetRecord record = record(taskId, "Vector Search", "https://example.com/vector", "example.com",
                "Vector search combines embeddings with nearest-neighbor retrieval for semantic matching.", "v");

        ResearchBriefResponse brief = ResearchBriefService.project(
                taskId, "How does vector search support semantic retrieval?", List.of(record));

        assertThat(brief.sections()).singleElement().satisfies(section -> {
            assertThat(section.label()).isEqualTo("Relevant evidence");
            assertThat(section.findings()).singleElement()
                    .extracting(ResearchBriefResponse.Finding::text)
                    .isEqualTo("Vector search combines embeddings with nearest-neighbor retrieval for semantic matching.");
        });
    }

    private static DatasetRecord record(UUID taskId, String title, String sourceUrl, String sourceName,
                                        String excerpt, String fingerprintSeed) {
        return new DatasetRecord(taskId, title, "", "", "https://" + sourceName, sourceUrl, sourceName,
                "WEB", excerpt, 90, String.format("%064x", Math.abs(fingerprintSeed.hashCode())));
    }
}
