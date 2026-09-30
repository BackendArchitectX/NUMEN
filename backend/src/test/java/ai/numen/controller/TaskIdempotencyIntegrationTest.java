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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
    void repeatedCreateWithSameIdempotencyKeyReturnsSameTask() throws Exception {
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

        assertThat(first).contains("\"id\":");
        assertThat(second).contains(extractId(first));
        assertThat(tasks.count()).isEqualTo(1);
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

    private static String extractId(String json) {
        int start = json.indexOf("\"id\":\"") + 6;
        int end = json.indexOf('"', start);
        return json.substring(start, end);
    }
}
