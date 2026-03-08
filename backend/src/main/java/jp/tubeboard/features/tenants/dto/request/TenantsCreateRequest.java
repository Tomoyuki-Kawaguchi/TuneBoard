package jp.tubeboard.features.tenants.dto.request;

import jakarta.validation.constraints.NotBlank;

public record TenantsCreateRequest(
        @NotBlank(message = "テナント名は必須です") String name) {
}
