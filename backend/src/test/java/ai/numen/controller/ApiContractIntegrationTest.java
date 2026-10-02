package ai.numen.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS;
import static org.springframework.http.HttpHeaders.ORIGIN;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiContractIntegrationTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void exposesVersionedOpenApiDocument() throws Exception {
        mvc.perform(get("/api/v1/openapi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("NUMEN API"))
                .andExpect(jsonPath("$.info.version").value("v1"));
    }

    @Test
    void unknownRouteReturnsStructuredNotFoundError() throws Exception {
        mvc.perform(get("/api/v1/this-route-must-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.code").value("ROUTE_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("The requested endpoint was not found"))
                .andExpect(jsonPath("$.path").value("/api/v1/this-route-must-not-exist"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    void corsAllowsIdempotentWorkflowCreationFromDocumentedLocalOrigin() throws Exception {
        mvc.perform(options("/api/v1/tasks")
                        .header(ORIGIN, "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,idempotency-key"))
                .andExpect(status().isOk())
                .andExpect(header().string(ACCESS_CONTROL_ALLOW_HEADERS, containsString("idempotency-key")))
                .andExpect(header().string(ACCESS_CONTROL_EXPOSE_HEADERS, containsString("Idempotency-Replayed")));
    }

    @Test
    void invalidCreateReturnsStableErrorCodeAndCorrelationId() throws Exception {
        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prompt\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }
}
