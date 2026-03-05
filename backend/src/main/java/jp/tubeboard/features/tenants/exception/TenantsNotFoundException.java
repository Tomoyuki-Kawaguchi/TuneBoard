package jp.tubeboard.features.tenants.exception;

public class TenantsNotFoundException extends RuntimeException {
    public TenantsNotFoundException(String message) {
        super(message);
    }

}
