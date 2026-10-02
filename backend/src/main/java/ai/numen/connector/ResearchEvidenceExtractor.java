package ai.numen.connector;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ResearchEvidenceExtractor {
    private static final int MAX_FACET_LENGTH = 320;
    private static final int MAX_EXCERPT_LENGTH = 1_100;
    private static final Pattern TOKEN = Pattern.compile("[\\p{L}\\p{N}][\\p{L}\\p{N}+#.-]*");
    private static final Pattern ASCIIDOC_TITLE = Pattern.compile("^\\s*=+\\s+(.+?)\\s*$");
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it", "its",
            "of", "on", "or", "that", "the", "their", "this", "to", "using", "with", "you", "your", "research",
            "summarize", "summary", "purpose", "key", "capabilities", "capability", "common", "use", "uses", "cases",
            "provided", "public", "source", "sources", "keep", "every", "result", "results", "connected", "evidence"
    );

    private ResearchEvidenceExtractor() { }

    static ExtractedEvidence extract(URI uri, Document document, String prompt) {
        String rawText = rawText(document);
        String title = extractTitle(uri, document, rawText);
        List<Candidate> candidates = candidates(rawText, document);
        String excerpt = buildExcerpt(prompt, candidates);

        if (excerpt.isBlank()) {
            excerpt = legacyExcerpt(document);
        }
        return new ExtractedEvidence(title, clip(excerpt, MAX_EXCERPT_LENGTH));
    }

    private static String extractTitle(URI uri, Document document, String rawText) {
        String documentTitle = cleanInline(document.title());
        if (meaningfulTitle(documentTitle, uri)) return documentTitle;

        Element h1 = document.selectFirst("h1");
        if (h1 != null) {
            String heading = cleanInline(h1.text());
            if (!heading.isBlank()) return heading;
        }

        int inspected = 0;
        for (String line : rawText.split("\\R")) {
            if (++inspected > 40) break;
            Matcher matcher = ASCIIDOC_TITLE.matcher(line);
            if (!matcher.matches()) continue;
            String heading = cleanHeading(matcher.group(1));
            if (!heading.isBlank()) return heading;
        }

        String host = uri.getHost();
        return host == null || host.isBlank() ? uri.toString() : host;
    }

    private static boolean meaningfulTitle(String title, URI uri) {
        if (title.isBlank()) return false;
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        String normalized = title.toLowerCase(Locale.ROOT);
        return !normalized.equals(host) && !normalized.startsWith("http://") && !normalized.startsWith("https://");
    }

    private static List<Candidate> candidates(String rawText, Document document) {
        List<Candidate> candidates = new ArrayList<>();
        int order = 0;

        for (String block : rawText.split("(?:\\R\\s*){2,}")) {
            String cleaned = cleanBlock(block);
            if (usable(cleaned)) candidates.add(new Candidate(cleaned, order++));
        }

        if (candidates.size() < 2) {
            for (Element element : document.select("main p, main li, article p, article li, body p, body li")) {
                String cleaned = cleanBlock(element.text());
                if (usable(cleaned) && candidates.stream().noneMatch(candidate -> candidate.text().equals(cleaned))) {
                    candidates.add(new Candidate(cleaned, order++));
                }
            }
        }
        return candidates;
    }

    private static boolean usable(String candidate) {
        if (candidate.length() < 45) return false;
        String lower = candidate.toLowerCase(Locale.ROOT);
        if (lower.startsWith("import ") || lower.startsWith("package ") || lower.startsWith("public class ")) return false;
        if (lower.contains("badge.svg") || lower.contains("img.shields.io")) return false;
        long urlCount = Pattern.compile("https?://", Pattern.CASE_INSENSITIVE).matcher(candidate).results().count();
        return urlCount <= 3;
    }

    private static String buildExcerpt(String prompt, List<Candidate> candidates) {
        if (candidates.isEmpty()) return "";

        String normalizedPrompt = prompt == null ? "" : prompt.toLowerCase(Locale.ROOT);
        Set<String> subjectTerms = subjectTerms(normalizedPrompt);
        Set<Integer> used = new HashSet<>();
        List<String> parts = new ArrayList<>();

        if (asksForPurpose(normalizedPrompt)) {
            Candidate purpose = best(candidates, subjectTerms, Facet.PURPOSE, used);
            if (purpose != null) {
                used.add(purpose.order());
                parts.add("Purpose: " + clip(purpose.text(), MAX_FACET_LENGTH));
            }
        }
        if (asksForCapabilities(normalizedPrompt)) {
            Candidate capabilities = best(candidates, subjectTerms, Facet.CAPABILITIES, used);
            if (capabilities != null) {
                used.add(capabilities.order());
                parts.add("Key capabilities: " + clip(capabilities.text(), MAX_FACET_LENGTH));
            }
        }
        if (asksForUseCases(normalizedPrompt)) {
            Candidate useCases = best(candidates, subjectTerms, Facet.USE_CASES, used);
            if (useCases != null) {
                used.add(useCases.order());
                parts.add("Common use cases: " + clip(useCases.text(), MAX_FACET_LENGTH));
            }
        }

        if (parts.isEmpty()) {
            Candidate first = best(candidates, subjectTerms, Facet.GENERAL, used);
            if (first != null) {
                used.add(first.order());
                parts.add(clip(first.text(), 520));
            }
            Candidate second = best(candidates, subjectTerms, Facet.GENERAL, used);
            if (second != null) parts.add(clip(second.text(), 420));
        }

        return String.join(" ", parts);
    }

    private static Candidate best(List<Candidate> candidates, Set<String> subjectTerms, Facet facet, Set<Integer> used) {
        Candidate best = null;
        int bestScore = Integer.MIN_VALUE;
        for (Candidate candidate : candidates) {
            if (used.contains(candidate.order())) continue;
            int score = score(candidate, subjectTerms, facet);
            if (score > bestScore) {
                best = candidate;
                bestScore = score;
            }
        }
        return best;
    }

    private static int score(Candidate candidate, Set<String> subjectTerms, Facet facet) {
        String lower = candidate.text().toLowerCase(Locale.ROOT);
        int score = Math.max(0, 5 - candidate.order());
        for (String term : subjectTerms) {
            if (containsWord(lower, term)) score += 8;
        }
        if (candidate.text().length() >= 80 && candidate.text().length() <= 700) score += 3;
        score += switch (facet) {
            case PURPOSE -> cueScore(lower, List.of("helps", "designed", "purpose", "production-grade", "opinionated", "aim", "goal"), 6);
            case CAPABILITIES -> cueScore(lower, List.of("feature", "features", "embedded", "security", "metrics", "health", "configuration", "support", "provides", "primary goals"), 6);
            case USE_CASES -> cueScore(lower, List.of("you can use", "create", "build", "application", "applications", "service", "services", "rest", "stand-alone", "standalone", "deployment"), 5);
            case GENERAL -> 0;
        };
        if (lower.contains("image:") || lower.contains("badge")) score -= 20;
        if (lower.contains("@restcontroller") || lower.contains("public static void") || lower.contains("./gradlew")) score -= 8;
        return score;
    }

    private static int cueScore(String text, List<String> cues, int weight) {
        int score = 0;
        for (String cue : cues) {
            if (text.contains(cue)) score += weight;
        }
        return score;
    }

    private static boolean containsWord(String text, String term) {
        return Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(term) + "(?![\\p{L}\\p{N}])")
                .matcher(text)
                .find();
    }

    private static Set<String> subjectTerms(String prompt) {
        Set<String> terms = new HashSet<>();
        Matcher matcher = TOKEN.matcher(prompt == null ? "" : prompt.toLowerCase(Locale.ROOT));
        while (matcher.find()) {
            String term = matcher.group();
            if (term.length() >= 3 && !STOP_WORDS.contains(term)) terms.add(term);
        }
        return terms;
    }

    private static boolean asksForPurpose(String prompt) {
        return prompt.contains("purpose") || prompt.contains("what is") || prompt.contains("overview");
    }

    private static boolean asksForCapabilities(String prompt) {
        return prompt.contains("capabilit") || prompt.contains("feature") || prompt.contains("functionality");
    }

    private static boolean asksForUseCases(String prompt) {
        return prompt.contains("use case") || prompt.contains("uses") || prompt.contains("used for");
    }

    private static String rawText(Document document) {
        if (document.body() == null) return cleanInline(document.text());
        String wholeText = document.body().wholeText();
        return wholeText == null || wholeText.isBlank() ? document.body().text() : wholeText;
    }

    private static String legacyExcerpt(Document document) {
        String excerpt = cleanInline(document.select("meta[name=description]").attr("content"));
        if (excerpt.isBlank()) excerpt = cleanInline(document.body() == null ? "" : document.body().text());
        return clip(excerpt, 420);
    }

    private static String cleanHeading(String value) {
        String withoutBadges = value == null ? "" : value.replaceFirst("\\s+image:https?://.*$", "");
        return cleanInline(withoutBadges.replace("`", ""));
    }

    private static String cleanBlock(String value) {
        if (value == null) return "";
        return cleanInline(value
                .replaceAll("(?m)^\\s*:[^\\r\\n]+$", " ")
                .replaceAll("(?m)^\\s*\\[(?:source|NOTE|TIP|IMPORTANT|WARNING|CAUTION)[^\\]]*]\\s*$", " ")
                .replaceAll("(?m)^\\s*(?:----|\\+\\+\\+\\+|```+).*?$", " ")
                .replaceAll("(?m)\\bimage:https?://.*$", " ")
                .replaceAll("https?://[^\\s\\[]+\\[([^\\]]+)]", "$1")
                .replaceAll("\\{[^}]+}", "")
                .replaceAll("(?m)^\\s*=+\\s+", "")
                .replaceAll("(?m)^\\s*[*+-]\\s+", "")
                .replace("`", ""));
    }

    private static String cleanInline(String value) {
        return value == null
                ? ""
                : value.replaceAll("[\\u202A-\\u202E\\u2066-\\u2069]", "")
                        .replaceAll("\\s+", " ")
                        .trim();
    }

    private static String clip(String value, int maxLength) {
        String cleaned = cleanInline(value);
        if (cleaned.length() <= maxLength) return cleaned;
        int boundary = cleaned.lastIndexOf(' ', maxLength - 1);
        int end = boundary >= Math.max(80, maxLength - 80) ? boundary : maxLength - 1;
        return cleaned.substring(0, end).trim() + "…";
    }

    record ExtractedEvidence(String title, String excerpt) { }

    private record Candidate(String text, int order) { }

    private enum Facet { PURPOSE, CAPABILITIES, USE_CASES, GENERAL }
}
