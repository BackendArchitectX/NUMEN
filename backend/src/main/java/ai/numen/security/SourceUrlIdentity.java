package ai.numen.security;

import java.net.IDN;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

public final class SourceUrlIdentity {
    private static final Set<String> SENSITIVE_QUERY_NAMES = Set.of(
            "access_token",
            "api_key",
            "apikey",
            "auth_token",
            "authorization",
            "credential",
            "password",
            "passwd",
            "secret",
            "signature",
            "token",
            "x-amz-credential",
            "x-amz-security-token",
            "x-amz-signature"
    );

    private SourceUrlIdentity() { }

    public static String normalizeForPersistence(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) throw new IllegalArgumentException("Source URL cannot be blank");

        try {
            URI uri = URI.create(trimmed).normalize();
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!scheme.equals("http") && !scheme.equals("https")) {
                throw new IllegalArgumentException("Only absolute HTTP(S) source URLs are supported");
            }
            if (uri.getHost() == null) {
                throw new IllegalArgumentException("Source URL must contain a public hostname");
            }
            if (uri.getUserInfo() != null) {
                throw new IllegalArgumentException("Source URLs must not contain embedded credentials");
            }

            int port = uri.getPort();
            if (port != -1 && port != 80 && port != 443) {
                throw new IllegalArgumentException("Only standard HTTP(S) ports 80 and 443 are allowed");
            }
            rejectSensitiveQuery(uri.getRawQuery());

            String host = canonicalHost(uri.getHost());
            String path = uri.getRawPath();
            if (path == null || path.isBlank()) path = "/";

            URI normalized = new URI(
                    scheme,
                    null,
                    host,
                    normalizedPort(scheme, port),
                    path,
                    uri.getRawQuery(),
                    null
            ).normalize();
            return normalized.toASCIIString();
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unsafe or invalid source URL");
        }
    }

    public static String safeAuditReference(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) return "urn:numen:source:invalid";

        try {
            return normalizeForPersistence(trimmed);
        } catch (IllegalArgumentException ignored) {
            // Build a deliberately query/credential-free audit reference below.
        }

        try {
            URI uri = URI.create(trimmed);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost();
            if ((scheme.equals("http") || scheme.equals("https")) && host != null) {
                String path = uri.getRawPath();
                if (path == null || path.isBlank()) path = "/";
                return new URI(
                        scheme,
                        null,
                        canonicalHost(host),
                        normalizedPort(scheme, uri.getPort()),
                        path,
                        null,
                        null
                ).toASCIIString();
            }
        } catch (Exception ignored) {
            // Fall through to a non-reversible generic reference.
        }
        return "urn:numen:source:rejected";
    }

    private static String canonicalHost(String rawHost) {
        String host = rawHost == null ? "" : rawHost.trim();
        if (host.startsWith("[") && host.endsWith("]")) {
            host = host.substring(1, host.length() - 1);
        }
        if (host.contains(":")) return host.toLowerCase(Locale.ROOT);
        return IDN.toASCII(host).toLowerCase(Locale.ROOT);
    }

    private static void rejectSensitiveQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) return;
        for (String pair : rawQuery.split("&")) {
            String rawName = pair.split("=", 2)[0];
            String name = URLDecoder.decode(rawName, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
            if (SENSITIVE_QUERY_NAMES.contains(name)) {
                throw new IllegalArgumentException("Source URL query contains credential-like parameters");
            }
        }
    }

    private static int normalizedPort(String scheme, int port) {
        if ((scheme.equals("http") && port == 80) || (scheme.equals("https") && port == 443)) return -1;
        return port;
    }
}
