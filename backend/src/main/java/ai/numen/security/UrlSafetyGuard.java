package ai.numen.security;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

@Component
public class UrlSafetyGuard {
    public URI requirePublicHttpUrl(String raw) {
        try {
            URI uri = URI.create(raw);
            boolean allowedScheme = "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
            if (!allowedScheme || uri.getHost() == null) throw new IllegalArgumentException("Only absolute HTTP(S) URLs are allowed");
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress() || address.isMulticastAddress()) {
                    throw new IllegalArgumentException("Private or local network targets are blocked");
                }
            }
            return uri;
        } catch (UnknownHostException | IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsafe or invalid source URL: " + raw);
        }
    }
}
