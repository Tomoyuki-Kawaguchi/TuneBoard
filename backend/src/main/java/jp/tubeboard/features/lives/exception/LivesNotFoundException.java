package jp.tubeboard.features.lives.exception;

public class LivesNotFoundException extends RuntimeException {
    public LivesNotFoundException(String message) {
        super(message);
    }
}