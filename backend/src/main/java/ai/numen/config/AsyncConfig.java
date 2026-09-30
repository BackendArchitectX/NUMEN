package ai.numen.config;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Map;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class AsyncConfig {
    @Bean(name = "taskExecutor")
    public ThreadPoolTaskExecutor taskExecutor(MeterRegistry registry) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("numen-workflow-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setTaskDecorator(runnable -> {
            Map<String, String> callerContext = MDC.getCopyOfContextMap();
            return () -> {
                Map<String, String> previous = MDC.getCopyOfContextMap();
                try {
                    if (callerContext == null) MDC.clear();
                    else MDC.setContextMap(callerContext);
                    runnable.run();
                } finally {
                    if (previous == null) MDC.clear();
                    else MDC.setContextMap(previous);
                }
            };
        });
        executor.initialize();

        Gauge.builder("numen.workflow.executor.active", executor, ThreadPoolTaskExecutor::getActiveCount)
                .description("Active NUMEN workflow executor threads")
                .register(registry);
        Gauge.builder("numen.workflow.executor.pool.size", executor, ThreadPoolTaskExecutor::getPoolSize)
                .description("Current NUMEN workflow executor pool size")
                .register(registry);
        Gauge.builder("numen.workflow.executor.queue.depth", executor,
                        value -> value.getThreadPoolExecutor().getQueue().size())
                .description("Queued NUMEN workflow executions")
                .register(registry);

        return executor;
    }
}
