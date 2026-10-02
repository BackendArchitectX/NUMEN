package ai.numen.connector;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ResearchEvidenceExtractorTest {
    @Test
    void generalResearchUsesQuestionRelevantEvidenceInsteadOfRawReadmeHeader() {
        String source = """
                = Spring Boot image:https://github.com/spring-projects/spring-boot/actions/workflows/build-and-deploy-snapshot.yml/badge.svg[Build Status]
                :docs: https://docs.spring.io/spring-boot
                :github: https://github.com/spring-projects/spring-boot

                Spring Boot helps you to create Spring-powered, production-grade applications and services with absolute minimum fuss.
                It takes an opinionated view of the Spring platform so that new and existing users can quickly get to the bits they need.

                You can use Spring Boot to create stand-alone Java applications that can be started using java -jar or more traditional WAR deployments.
                We also provide a command-line tool that runs Spring scripts.

                Our primary goals are:

                * Provide a radically faster and widely accessible getting started experience for all Spring development.
                * Be opinionated, but get out of the way quickly as requirements start to diverge from the defaults.
                * Provide a range of non-functional features common to large classes of projects, including embedded servers, security, metrics, health checks and externalized configuration.
                * Absolutely no code generation and no requirement for XML configuration.

                == Guides

                Building a RESTful Web Service with Spring Boot Actuator shows how to create a REST web service and configure the server.
                """;
        Document document = Jsoup.parse("<html><body></body></html>");
        document.body().appendElement("pre").text(source);

        var record = HttpPageConnector.recordFromDocument(
                UUID.randomUUID(),
                URI.create("https://raw.githubusercontent.com/spring-projects/spring-boot/main/README.adoc"),
                document,
                "Research Spring Boot and summarize its purpose, key capabilities, and common use cases using the provided public source.",
                "GENERAL_RESEARCH"
        );

        assertThat(record.getTitle()).isEqualTo("Spring Boot");
        assertThat(record.getExcerpt())
                .contains("Purpose:")
                .contains("production-grade applications and services")
                .contains("Key capabilities:")
                .contains("embedded servers, security, metrics, health checks")
                .contains("Common use cases:")
                .contains("stand-alone Java applications")
                .doesNotContain("badge.svg")
                .doesNotContain("img.shields.io");
        assertThat(record.getSourceName()).isEqualTo("raw.githubusercontent.com");
        assertThat(record.getSourceUrl()).isEqualTo("https://raw.githubusercontent.com/spring-projects/spring-boot/main/README.adoc");
        assertThat(record.getEvidenceHash()).hasSize(64);
    }

    @Test
    void genericResearchFallsBackToMostQuestionRelevantPassages() {
        Document document = Jsoup.parse("""
                <html><head><title>Platform Notes</title></head><body>
                <p>Navigation and account information for the documentation portal.</p>
                <p>Vector search combines embeddings with nearest-neighbor retrieval for semantic matching.</p>
                <p>Operational guidance covers indexing, latency, and retrieval quality.</p>
                </body></html>
                """);

        var extracted = ResearchEvidenceExtractor.extract(
                URI.create("https://example.com/vector-search"),
                document,
                "How does vector search support semantic retrieval?"
        );

        assertThat(extracted.title()).isEqualTo("Platform Notes");
        assertThat(extracted.excerpt()).contains("Vector search combines embeddings");
    }
    @Test
    void requestedFacetsAreNotInventedWhenTheSourceHasNoFacetEvidence() {
        Document document = Jsoup.parse("""
                <html><head><title>Vector Notes</title></head><body>
                <p>Vector search combines embeddings with nearest-neighbor retrieval for semantic matching.</p>
                <p>Index maintenance affects latency and retrieval quality across large collections.</p>
                </body></html>
                """);

        var extracted = ResearchEvidenceExtractor.extract(
                URI.create("https://example.com/vector"),
                document,
                "Summarize the purpose, key capabilities, and common use cases of vector search."
        );

        assertThat(extracted.excerpt())
                .contains("Vector search combines embeddings")
                .doesNotContain("Purpose:")
                .doesNotContain("Key capabilities:")
                .doesNotContain("Common use cases:");
    }

    @Test
    void genericResearchDoesNotPromoteContextualSourceNotesIntoEvidence() {
        Document document = Jsoup.parse("<html><body></body></html>");
        document.body().appendElement("pre").text("""
                # NUMEN Synthetic Compatibility Fixture

                > Synthetic acceptance fixture for NUMEN disagreement detection. This is test data, not factual product documentation.

                Acme Runtime 2.0 requires at least Java 17 and is compatible with versions up to and including Java 25. Protocol 1.2 is also required for production deployments.
                """);

        var extracted = ResearchEvidenceExtractor.extract(
                URI.create("https://raw.githubusercontent.com/BackendArchitectX/NUMEN/main/docs/acceptance/source-disagreement-a.md"),
                document,
                "Compare the Java compatibility stated by the provided Acme Runtime 2.0 sources. Identify any disagreement."
        );

        assertThat(extracted.excerpt())
                .contains("Acme Runtime 2.0")
                .contains("Java 25")
                .doesNotContain("Synthetic acceptance fixture")
                .doesNotContain("not factual product documentation")
                .doesNotContain(">");
    }

    @Test
    void genericResearchKeepsASecondPassageWhenItIsSubstantivelyRelevant() {
        Document document = Jsoup.parse("""
                <html><head><title>Vector Search Notes</title></head><body>
                <p>Vector search combines embeddings with nearest-neighbor retrieval for semantic matching.</p>
                <p>Vector search indexing choices affect retrieval latency and recall across large collections.</p>
                <p>Account navigation links are available in the documentation header.</p>
                </body></html>
                """);

        var extracted = ResearchEvidenceExtractor.extract(
                URI.create("https://example.com/vector"),
                document,
                "Explain vector search retrieval and indexing."
        );

        assertThat(extracted.excerpt())
                .contains("nearest-neighbor retrieval")
                .contains("indexing choices")
                .doesNotContain("Account navigation");
    }

    @Test
    void collapsesRepeatedHtmlDocumentTitlesWithoutHidingDistinctQualifiers() {
        Document repeated = Jsoup.parse("""
                <html><head><title>Spring Boot :: Spring Boot</title></head>
                <body><p>Spring Boot helps create production-grade applications.</p></body></html>
                """);
        var repeatedTitle = ResearchEvidenceExtractor.extract(
                URI.create("https://docs.spring.io/spring-boot/"),
                repeated,
                "Research Spring Boot."
        );
        assertThat(repeatedTitle.title()).isEqualTo("Spring Boot");

        assertThat(ResearchEvidenceExtractor.normalizeRepeatedTitle("Spring Boot | Spring Boot"))
                .isEqualTo("Spring Boot");
        assertThat(ResearchEvidenceExtractor.normalizeRepeatedTitle("Spring Boot — Spring Boot"))
                .isEqualTo("Spring Boot");
        assertThat(ResearchEvidenceExtractor.normalizeRepeatedTitle("Spring Boot :: Reference Documentation"))
                .isEqualTo("Spring Boot :: Reference Documentation");
    }

    @Test
    void markdownHeadingCanProvideTheDocumentTitle() {
        Document document = Jsoup.parse("<html><body></body></html>");
        document.body().appendElement("pre").text("""
                # Vector Search Guide

                Vector search combines embeddings with nearest-neighbor retrieval for semantic matching.
                """);

        var extracted = ResearchEvidenceExtractor.extract(
                URI.create("https://raw.example.org/vector.md"),
                document,
                "Explain vector search."
        );

        assertThat(extracted.title()).isEqualTo("Vector Search Guide");
    }
}
