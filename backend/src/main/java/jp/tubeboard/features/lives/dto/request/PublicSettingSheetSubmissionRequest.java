package jp.tubeboard.features.lives.dto.request;

import java.util.List;

public record PublicSettingSheetSubmissionRequest(
        List<FieldAnswerRequest> answers) {

    public record FieldAnswerRequest(
            String fieldId,
            List<String> values,
            List<GroupItemRequest> items) {
    }

    public record GroupItemRequest(
            List<FieldAnswerRequest> answers) {
    }
}