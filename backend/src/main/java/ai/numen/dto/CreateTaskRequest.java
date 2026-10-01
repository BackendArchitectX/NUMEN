package ai.numen.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateTaskRequest(
        @NotBlank @Size(min = 10, max = 4000) String prompt,
        boolean demoMode,
        @Size(max = 32) List<@NotBlank @Size(max = 2048) String> sourceUrls
) {
    public CreateTaskRequest {
        sourceUrls = sourceUrls == null ? List.of() : List.copyOf(sourceUrls);
    }
}
