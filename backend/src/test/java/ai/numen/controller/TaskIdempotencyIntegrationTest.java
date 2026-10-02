package ai.numen.controller;

import ai.numen.repository.CollectionTaskRepository;
import ai.numen.service.TaskRunner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TaskIdempotencyIntegrationTest {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private CollectionTaskRepository tasks;

    @MockBean
    private TaskRunner runner;

    @BeforeEach
    void clean() {
        tasks.deleteAll();
    }

    @Test
    void repeatedCreateWithSameIdempotencyKeyReturnsSameTaskAndOneCreatedTimelineEvent() throws Exception {
        String body = "{\"prompt\":\"Collect traceable public market intelligence\"}";
        String key = "11111111-2222-3333-4444-555555555555";

        String first = mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content(body))
                .andExpect(status().isAccepted())
                .andExpect(header().string("Idempotency-Replayed", "false"))
                .andReturn().getResponse().getContentAsString();

        String second = mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content(body))
                .andExpect(status().isAccepted())
                .andExpect(header().string("Idempotency-Replayed", "true"))
                .andReturn().getResponse().getContentAsString();

        String taskId = extractId(first);
        assertThat(second).contains(taskId);
        assertThat(tasks.count()).isEqualTo(1);

        mvc.perform(get("/api/v1/tasks/{id}/timeline", taskId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].eventType").value("CREATED"))
                .andExpect(jsonPath("$[0].status").value("QUEUED"))
                .andExpect(jsonPath("$[0].stage").value("Queued"));
    }

    @Test
    void rejectsReuseOfIdempotencyKeyForDifferentRequest() throws Exception {
        String key = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content("{\"prompt\":\"Collect traceable public market intelligence\"}"))
                .andExpect(status().isAccepted());

        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content("{\"prompt\":\"Collect a different traceable dataset\"}"))
                .andExpect(status().isConflict());
    }


    @Test
    void rejectsReuseOfIdempotencyKeyForDifferentDemoMode() throws Exception {
        String key = "demo-mode-conflict-key";

        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content("{\"prompt\":\"Collect traceable public market intelligence\",\"demoMode\":false}"))
                .andExpect(status().isAccepted());

        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content("{\"prompt\":\"Collect traceable public market intelligence\",\"demoMode\":true}"))
                .andExpect(status().isConflict());
    }


    @Test
    void persistsExplicitSourcesAndRejectsIdempotencyReuseWithDifferentScope() throws Exception {
        String key = "source-scope-conflict-key";
        String firstBody = "{\"prompt\":\"Research the supplied public source with evidence\",\"sourceUrls\":[\"https://example.com/research\"]}";

        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content(firstBody))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.sourceUrls.length()").value(1))
                .andExpect(jsonPath("$.sourceUrls[0]").value("https://example.com/research"));

        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", key)
                        .content("{\"prompt\":\"Research the supplied public source with evidence\",\"sourceUrls\":[\"https://example.org/other\"]}"))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectsCredentialBearingExplicitSourceBeforeTaskPersistence() throws Exception {
        long before = tasks.count();

        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "credential-source-rejection")
                        .content("{\"prompt\":\"Research the supplied public source with evidence\",\"sourceUrls\":[\"https://user:pass@example.com/research\"]}"))
                .andExpect(status().isBadRequest());

        assertThat(tasks.count()).isEqualTo(before);
    }

    @Test
    void canonicalizesExplicitSourceIdentityBeforePersistence() throws Exception {
        mvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "canonical-source-identity")
                        .content("{\"prompt\":\"Research the supplied public source with evidence\",\"sourceUrls\":[\"HTTPS://Example.COM:443/a/../research#fragment\"]}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.sourceUrls[0]").value("https://example.com/research"));
    }

    private static String extractId(String json) {
        int start = json.indexOf("\"id\":\"") + 6;
        int end = json.indexOf('"', start);
        return json.substring(start, end);
    }
}
