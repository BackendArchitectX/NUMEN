package ai.numen.security;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

@Component
public class UrlSafetyGuard {
    public URI requirePublicHttpUrl(String raw) {
        try {
            URI uri = URI.create(raw);
            boolean allowedScheme = "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
            if (!allowedScheme || uri.getHost() == null) {
                throw new IllegalArgumentException("Only absolute HTTP(S) URLs are allowed");
            }
            if (uri.getUserInfo() != null) {
                throw new IllegalArgumentException("Source URLs must not contain embedded credentials");
            }

            int port = uri.getPort();
            if (port != -1 && port != 80 && port != 443) {
                throw new IllegalArgumentException("Only standard HTTP(S) ports 80 and 443 are allowed");
            }

            String host = uri.getHost().toLowerCase(Locale.ROOT);
            if (host.equals("localhost")
                    || host.endsWith(".localhost")
                    || host.equals("home.arpa")
                    || host.endsWith(".home.arpa")
                    || host.endsWith(".local")
                    || host.endsWith(".internal")
                    || host.endsWith(".invalid")
                    || host.endsWith(".test")) {
                throw new IllegalArgumentException("Local or internal hostnames are blocked");
            }

            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (isNonPublic(address)) {
                    throw new IllegalArgumentException("Private, local or reserved network targets are blocked");
                }
            }
            return uri;
        } catch (UnknownHostException | IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsafe or invalid source URL");
        }
    }

    static boolean isNonPublic(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) {
            return true;
        }

        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int a = Byte.toUnsignedInt(bytes[0]);
            int b = Byte.toUnsignedInt(bytes[1]);
            int c = Byte.toUnsignedInt(bytes[2]);

            if (a == 0 || a == 10 || a == 127 || a >= 224) return true;
            if (a == 100 && b >= 64 && b <= 127) return true;
            if (a == 169 && b == 254) return true;
            if (a == 172 && b >= 16 && b <= 31) return true;
            if (a == 192 && b == 168) return true;
            if (a == 192 && b == 0 && (c == 0 || c == 2)) return true;
            if (a == 198 && (b == 18 || b == 19)) return true;
            if (a == 198 && b == 51 && c == 100) return true;
            if (a == 203 && b == 0 && c == 113) return true;
        }

        if (bytes.length == 16) {
            int first = Byte.toUnsignedInt(bytes[0]);
            int second = Byte.toUnsignedInt(bytes[1]);
            if ((first & 0xFE) == 0xFC) return true;
            if (first == 0x20 && second == 0x01
                    && Byte.toUnsignedInt(bytes[2]) == 0x0D
                    && Byte.toUnsignedInt(bytes[3]) == 0xB8) return true;
        }

        return false;
    }
}
