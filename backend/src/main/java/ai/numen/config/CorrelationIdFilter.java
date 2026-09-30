package ai.numen.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Correlation-ID";
    public static final String MDC_KEY = "correlationId";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    private static final Logger log = LoggerFactory.getLogger(CorrelationIdFilter.class);
    private static final long SLOW_REQUEST_MS = 2_000L;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String correlationId = resolveCorrelationId(request.getHeader(HEADER));
        long started = System.nanoTime();
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(HEADER, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - started) / 1_000_000;
            int status = response.getStatus();
            if (status >= 500 || durationMs >= SLOW_REQUEST_MS) {
                log.warn("http_request method={} uri={} status={} durationMs={}",
                        request.getMethod(), request.getRequestURI(), status, durationMs);
            } else if (status >= 400) {
                log.info("http_request method={} uri={} status={} durationMs={}",
                        request.getMethod(), request.getRequestURI(), status, durationMs);
            } else {
                log.debug("http_request method={} uri={} status={} durationMs={}",
                        request.getMethod(), request.getRequestURI(), status, durationMs);
            }
            MDC.remove(MDC_KEY);
        }
    }

    static String resolveCorrelationId(String candidate) {
        if (candidate != null && SAFE_ID.matcher(candidate).matches()) return candidate;
        return UUID.randomUUID().toString();
    }
}
