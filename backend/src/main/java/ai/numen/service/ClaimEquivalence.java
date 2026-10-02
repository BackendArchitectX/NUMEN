package ai.numen.service;

import java.text.Normalizer;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ClaimEquivalence {
    private static final int MIN_SEMANTIC_TOKENS = 5;
    private static final double MIN_OVERLAP = 0.75d;
    private static final double MIN_JACCARD = 0.55d;
    private static final double MIN_LIST_JACCARD = 0.85d;

    private static final Pattern TOKEN = Pattern.compile("[\\p{L}\\p{N}+#]+");
    private static final Pattern NUMBER = Pattern.compile("(?<![\\p{L}\\p{N}])\\d+(?:\\.\\d+)*(?![\\p{L}\\p{N}])");
    private static final Pattern LIST_CUE = Pattern.compile("(?i)\\b(?:including|such as|for example)\\b");

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "been", "being", "by", "can", "could",
            "for", "from", "has", "have", "help", "helps", "in", "into", "is", "it", "its", "of",
            "on", "or", "that", "the", "their", "this", "to", "using", "use", "uses", "with", "you",
            "your", "provide", "provides", "create", "creates", "creating", "started", "start", "run",
            "runs", "common", "range", "large", "class", "classes", "such", "example", "absolute",
            "minimum", "fuss", "based", "powered", "more", "traditional"
    );

    private static final Set<String> TITLE_NOISE = Set.of(
            "documentation", "docs", "reference", "guide", "overview", "official", "home", "manual",
            "project", "page", "readme"
    );

    private static final Set<String> NEGATION = Set.of(
            "no", "not", "never", "without", "cannot", "cant", "doesnt", "isnt", "wont", "neither", "nor", "lack", "lacks"
    );

    private static final Set<String> HARD_QUALIFIERS = Set.of(
            "must", "required", "requires", "mandatory", "only", "always", "never", "cannot", "prohibited"
    );

    private ClaimEquivalence() { }

    static boolean equivalent(String leftText, String leftTitle, String rightText, String rightTitle) {
        String leftSurface = canonicalSurface(leftText);
        String rightSurface = canonicalSurface(rightText);
        if (leftSurface.isBlank() || rightSurface.isBlank()) return false;
        if (leftSurface.equals(rightSurface)) return true;

        Signature left = signature(leftText, leftTitle);
        Signature right = signature(rightText, rightTitle);

        if (left.tokens().size() < MIN_SEMANTIC_TOKENS || right.tokens().size() < MIN_SEMANTIC_TOKENS) {
            return false;
        }
        if (left.negated() != right.negated()) return false;
        if (!left.numbers().equals(right.numbers())) return false;
        if (!left.hardQualifiers().equals(right.hardQualifiers())) return false;
        if (!anchorsCompatible(left.titleAnchors(), right.titleAnchors())) return false;

        Set<String> intersection = new HashSet<>(left.tokens());
        intersection.retainAll(right.tokens());
        Set<String> union = new HashSet<>(left.tokens());
        union.addAll(right.tokens());

        double overlap = intersection.size() / (double) Math.min(left.tokens().size(), right.tokens().size());
        double jaccard = intersection.size() / (double) union.size();
        double requiredJaccard = left.listLike() || right.listLike() ? MIN_LIST_JACCARD : MIN_JACCARD;

        return overlap >= MIN_OVERLAP && jaccard >= requiredJaccard;
    }

    static String canonicalSurface(String value) {
        String normalized = normalize(value)
                .replace("stand-alone", "standalone")
                .replace("stand alone", "standalone")
                .replaceAll("(?<=\\p{L})[-–—](?=\\p{L})", " ")
                .replaceAll("[^\\p{L}\\p{N}+#]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.toLowerCase(Locale.ROOT);
    }

    static String preferredRepresentative(String current, String candidate) {
        String left = normalizeText(current);
        String right = normalizeText(candidate);
        if (left.isBlank()) return right;
        if (right.isBlank()) return left;
        if (right.length() < left.length()) return right;
        if (right.length() > left.length()) return left;
        return right.compareToIgnoreCase(left) < 0 ? right : left;
    }

    private static Signature signature(String text, String title) {
        String normalized = canonicalSurface(text);
        Set<String> tokens = contentTokens(normalized);
        Set<String> numbers = numbers(normalized);
        Set<String> words = rawTokens(normalized);

        boolean negated = words.stream().anyMatch(NEGATION::contains);
        Set<String> hardQualifiers = new HashSet<>(words);
        hardQualifiers.retainAll(HARD_QUALIFIERS);

        return new Signature(
                tokens,
                numbers,
                negated,
                Set.copyOf(hardQualifiers),
                titleAnchors(title),
                isListLike(text)
        );
    }

    private static boolean isListLike(String text) {
        String normalized = normalizeText(text);
        if (LIST_CUE.matcher(normalized).find() || normalized.indexOf(';') >= 0) return true;
        long commas = normalized.chars().filter(character -> character == ',').count();
        return commas >= 2;
    }

    private static Set<String> contentTokens(String normalized) {
        Set<String> tokens = new HashSet<>();
        Matcher matcher = TOKEN.matcher(normalized);
        while (matcher.find()) {
            String token = stem(matcher.group().toLowerCase(Locale.ROOT));
            if (token.length() < 2 || STOP_WORDS.contains(token)) continue;
            tokens.add(token);
        }
        return Set.copyOf(tokens);
    }

    private static Set<String> titleAnchors(String title) {
        String normalized = canonicalSurface(title);
        Set<String> anchors = new HashSet<>();
        Matcher matcher = TOKEN.matcher(normalized);
        while (matcher.find()) {
            String token = stem(matcher.group().toLowerCase(Locale.ROOT));
            if (token.length() < 2 || STOP_WORDS.contains(token) || TITLE_NOISE.contains(token)) continue;
            anchors.add(token);
        }
        return Set.copyOf(anchors);
    }

    private static boolean anchorsCompatible(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) return false;
        Set<String> intersection = new HashSet<>(left);
        intersection.retainAll(right);
        double overlap = intersection.size() / (double) Math.min(left.size(), right.size());
        return overlap >= 0.75d;
    }

    private static Set<String> numbers(String normalized) {
        Set<String> numbers = new HashSet<>();
        Matcher matcher = NUMBER.matcher(normalized);
        while (matcher.find()) numbers.add(matcher.group());
        return Set.copyOf(numbers);
    }

    private static Set<String> rawTokens(String normalized) {
        Set<String> tokens = new HashSet<>();
        Matcher matcher = TOKEN.matcher(normalized);
        while (matcher.find()) tokens.add(matcher.group().toLowerCase(Locale.ROOT));
        return Set.copyOf(tokens);
    }

    private static String stem(String token) {
        if (token.length() > 5 && token.endsWith("ies")) {
            return token.substring(0, token.length() - 3) + "y";
        }
        if (token.length() > 5 && token.endsWith("sses")) {
            return token.substring(0, token.length() - 2);
        }
        if (token.length() > 5 && (
                token.endsWith("ches") || token.endsWith("shes") || token.endsWith("xes") || token.endsWith("zes"))) {
            return token.substring(0, token.length() - 2);
        }
        if (token.length() > 4 && token.endsWith("s") && !token.endsWith("ss")) {
            return token.substring(0, token.length() - 1);
        }
        return token;
    }

    private static String normalizeText(String value) {
        return normalize(value)
                .replaceAll("[\\u202A-\\u202E\\u2066-\\u2069]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC);
    }

    private record Signature(
            Set<String> tokens,
            Set<String> numbers,
            boolean negated,
            Set<String> hardQualifiers,
            Set<String> titleAnchors,
            boolean listLike) { }
}
