package ai.numen.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI numenOpenApi() {
        return new OpenAPI().info(new Info()
                .title("NUMEN API")
                .version("v1")
                .description("Versioned API for managed data-intelligence workflows, source-backed datasets and progress streams.")
                .contact(new Contact().name("BackendArchitectX")));
    }
}
