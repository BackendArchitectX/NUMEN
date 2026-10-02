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
