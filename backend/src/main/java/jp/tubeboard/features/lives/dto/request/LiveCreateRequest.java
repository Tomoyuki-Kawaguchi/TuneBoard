package jp.tubeboard.features.lives.dto.request;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jp.tubeboard.features.lives.model.LiveStatus;

public record LiveCreateRequest(
        @NotNull(message = "テナントIDは必須です") UUID tenantId,
        @NotBlank(message = "ライブ名は必須です") @Size(max = 255, message = "ライブ名は255文字以内で入力してください") String name,
        LocalDate date,
        @Size(max = 255, message = "会場は255文字以内で入力してください") String location,
        LocalDateTime deadlineAt,
        LiveStatus status) {
}