package ai.numen.exception;

public class WorkflowCapacityException extends RuntimeException {
    public WorkflowCapacityException(String message, Throwable cause) {
        super(message, cause);
    }
}
