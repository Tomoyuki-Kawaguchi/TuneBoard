package jp.tubeboard.common.exception;

import java.util.Map;

public class BadRequestException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public BadRequestException(String message) {
        this(message, null);
    }

    public BadRequestException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}