package ai.numen.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTaskRequest(
        @NotBlank @Size(min = 10, max = 4000) String prompt,
        boolean demoMode
) { }
