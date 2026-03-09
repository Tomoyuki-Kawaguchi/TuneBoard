package jp.tubeboard.features.lives.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jp.tubeboard.features.lives.model.LiveStatus;

public record PublicLiveResponse(
        String name,
        LocalDate date,
        String location,
        LocalDateTime deadlineAt,
        LiveStatus status) {
}