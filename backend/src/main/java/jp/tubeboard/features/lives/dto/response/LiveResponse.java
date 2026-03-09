package jp.tubeboard.features.lives.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import jp.tubeboard.features.lives.model.LiveStatus;

public record LiveResponse(
        UUID id,
        UUID tenantId,
        String tenantName,
        String publicToken,
        String name,
        LocalDate date,
        String location,
        LocalDateTime deadlineAt,
        LiveStatus status) {
}