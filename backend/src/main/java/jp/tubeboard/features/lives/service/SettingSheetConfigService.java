package jp.tubeboard.features.lives.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.FormBlockRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.LayoutRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.OptionSourceRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.OptionSourceResponse;
import jp.tubeboard.features.lives.model.Live;

@Service
public class SettingSheetConfigService {

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    public SettingSheetConfigResponse defaultSettingSheetConfig() {
        List<FormBlockResponse> memberFields = List.of(
                textBlock("member-name", "氏名", true, layoutHalf(1)),
                selectBlock("member-parts", SettingSheetConstants.BLOCK_MULTI_SELECT, "担当パート", true,
                        List.of("Vo", "Gt", "Ba", "Dr", "Key", "Cho", "DJ"), null, layoutHalf(2)),
                booleanBlock("member-representative", "代表者", "代表者にチェックを入れてください。", layoutHalf(1)));
        List<FormBlockResponse> songMicFields = List.of(
                selectBlock("mic-member", SettingSheetConstants.BLOCK_SINGLE_SELECT, "担当者", true, List.of(),
                        optionSource("members", "member-name"), layoutHalf(1)),
                booleanBlock("mic-main-vocal", "メインボーカル", "", layoutHalf(1)));
        List<FormBlockResponse> songFields = List.of(
                textBlock("song-title", "曲名", true, layoutHalf(1)),
                textBlock("song-artist", "アーティスト名", true, layoutHalf(1)),
                selectBlock("song-parts", SettingSheetConstants.BLOCK_MULTI_SELECT, "使うパート", true,
                        List.of("Vo", "Gt", "Ba", "Dr", "Key", "Cho", "SE", "同期"), null, layoutFull(2)),
                longTextBlock("song-note-pa", "PAへの要望", false, layoutHalf(1)),
                longTextBlock("song-note-light", "照明への要望", false, layoutHalf(1)),
                longTextBlock("song-note-other", "備考", false, layoutFull(1)),
                groupBlock("song-mics", "使うマイク", "誰がどのマイクを使うか入力します。", false, true, 0, "マイク追加", "マイク",
                        "mic-member", layoutFull(1), songMicFields));
        return new SettingSheetConfigResponse(
                SettingSheetConstants.DEFAULT_FORM_TITLE,
                SettingSheetConstants.DEFAULT_FORM_DESCRIPTION,
                SettingSheetConstants.DEFAULT_SUBMIT_LABEL,
                List.of(
                        sectionBlock("section-band", "バンド基本情報", "バンド名、提出状況、備考を入力します。"),
                        textBlock("band-name", "バンド名", true, layoutHalf(1)),
                        selectBlock("submission-status", SettingSheetConstants.BLOCK_SINGLE_SELECT, "提出状況", true,
                                List.of("未完成", "完成"), null, layoutHalf(1)),
                        longTextBlock("detail", "備考", false, layoutFull(1)),
                        groupBlock("members", "出演者", "出演者と担当パートを入力します。", true, true, 1, "メンバー追加", "メンバー",
                                "member-name", layoutFull(1), memberFields),
                        groupBlock("songs", "演奏する曲", "曲名、使用パート、マイク設定を入力します。", true, true, 1, "曲を追加", "曲",
                                "song-title", layoutFull(1), songFields)));
    }

    public SettingSheetConfigResponse readSettingSheetConfig(Live live) {
        if (live.getSettingsJson() == null || live.getSettingsJson().isBlank()) {
            return defaultSettingSheetConfig();
        }
        try {
            SettingSheetConfigResponse parsed = objectMapper.readValue(live.getSettingsJson(),
                    SettingSheetConfigResponse.class);
            return normalizeSettingSheetConfig(new SettingSheetConfigUpdateRequest(
                    parsed.title(),
                    parsed.description(),
                    parsed.submitButtonLabel(),
                    mapToFormBlockRequests(parsed.blocks())));
        } catch (JsonProcessingException ex) {
            return defaultSettingSheetConfig();
        }
    }

    public String writeSettingSheetConfig(SettingSheetConfigResponse config) {
        try {
            return objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("セッティングシート設定の保存に失敗しました", ex);
        }
    }

    public SettingSheetConfigResponse normalizeSettingSheetConfig(SettingSheetConfigUpdateRequest request) {
        return new SettingSheetConfigResponse(
                safeTextOrDefault(request.title(), SettingSheetConstants.DEFAULT_FORM_TITLE),
                safeTextOrDefault(request.description(), SettingSheetConstants.DEFAULT_FORM_DESCRIPTION),
                safeTextOrDefault(request.submitButtonLabel(), SettingSheetConstants.DEFAULT_SUBMIT_LABEL),
                normalizeBlocks(request.blocks()));
    }

    private List<FormBlockResponse> normalizeBlocks(List<FormBlockRequest> values) {
        if (values == null) {
            return defaultSettingSheetConfig().blocks();
        }
        List<FormBlockResponse> normalizedBlocks = new ArrayList<>();
        for (FormBlockRequest block : values) {
            normalizedBlocks.add(normalizeBlock(block));
        }
        return List.copyOf(normalizedBlocks);
    }

    private FormBlockResponse normalizeBlock(FormBlockRequest block) {
        String type = normalizeBlockType(block.type());
        boolean valueBlock = SettingSheetConstants.VALUE_BLOCK_TYPES.contains(type);
        boolean sectionBlock = SettingSheetConstants.BLOCK_SECTION.equals(type);
        boolean repeatableGroup = SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(type);
        OptionSourceResponse optionSource = SettingSheetConstants.OPTION_BLOCK_TYPES.contains(type)
                ? normalizeOptionSource(block.optionSource())
                : null;
        return new FormBlockResponse(
                safeTextOrDefault(block.id(), UUID.randomUUID().toString()),
                type,
                safeTextOrDefault(block.label(), defaultBlockLabel(type)),
                safeText(block.description()),
                Boolean.TRUE.equals(block.hidden()),
                (valueBlock || repeatableGroup) && Boolean.TRUE.equals(block.required()),
                repeatableGroup && Boolean.TRUE.equals(block.collapsible()),
                normalizeAppearance(block.appearance(), defaultAppearance(type)),
                repeatableGroup ? normalizeAppearance(block.itemAppearance(), SettingSheetConstants.APPEARANCE_OUTLINE)
                        : SettingSheetConstants.APPEARANCE_PLAIN,
                SettingSheetConstants.OPTION_BLOCK_TYPES.contains(type) && optionSource == null
                        ? normalizeOptions(block.options(), List.of("選択肢1"))
                        : List.of(),
                repeatableGroup ? Math.max(0, block.minItems() == null ? 0 : block.minItems()) : 0,
                repeatableGroup ? safeTextOrDefault(block.addButtonLabel(), "項目を追加") : "",
                repeatableGroup ? safeTextOrDefault(block.entryTitle(), "項目") : "",
                repeatableGroup ? safeText(block.titleSourceFieldId()) : "",
                (repeatableGroup || sectionBlock) ? normalizeBlocks(block.fields()) : List.of(),
                normalizeLayout(block.layout()),
                optionSource);
    }

    private List<FormBlockRequest> mapToFormBlockRequests(List<FormBlockResponse> blocks) {
        if (blocks == null) {
            return null;
        }
        return blocks.stream().map(block -> new FormBlockRequest(
                block.id(),
                block.type(),
                block.label(),
                block.description(),
                block.hidden(),
                block.required(),
                block.collapsible(),
                block.appearance(),
                block.itemAppearance(),
                block.options(),
                block.minItems(),
                block.addButtonLabel(),
                block.entryTitle(),
                block.titleSourceFieldId(),
                mapToFormBlockRequests(block.fields()),
                block.layout() == null ? null
                        : new LayoutRequest(block.layout().width(), block.layout().optionColumns(),
                                block.layout().optionFitContent()),
                block.optionSource() == null ? null
                        : new OptionSourceRequest(block.optionSource().blockId(), block.optionSource().fieldId())))
                .toList();
    }

    private String normalizeBlockType(String value) {
        String normalized = safeText(value).toUpperCase();
        return SettingSheetConstants.SUPPORTED_BLOCK_TYPES.contains(normalized)
                ? normalized
                : SettingSheetConstants.BLOCK_SHORT_TEXT;
    }

    private String defaultBlockLabel(String type) {
        return switch (type) {
            case SettingSheetConstants.BLOCK_SECTION -> "セクション見出し";
            case SettingSheetConstants.BLOCK_BOOLEAN -> "チェック項目";
            case SettingSheetConstants.BLOCK_REPEATABLE_GROUP -> "繰り返しグループ";
            default -> "質問";
        };
    }

    private OptionSourceResponse normalizeOptionSource(OptionSourceRequest source) {
        if (source == null) {
            return null;
        }
        String blockId = safeText(source.blockId());
        String fieldId = safeText(source.fieldId());
        return blockId.isBlank() || fieldId.isBlank() ? null : new OptionSourceResponse(blockId, fieldId);
    }

    private LayoutResponse normalizeLayout(LayoutRequest layout) {
        String width = layout == null ? SettingSheetConstants.LAYOUT_FULL : safeText(layout.width()).toLowerCase();
        if (!SettingSheetConstants.LAYOUT_WIDTHS.contains(width)) {
            width = SettingSheetConstants.LAYOUT_FULL;
        }
        int optionColumns = layout == null || layout.optionColumns() == null ? 1 : layout.optionColumns();
        return new LayoutResponse(width, Math.max(1, Math.min(3, optionColumns)),
                layout != null && Boolean.TRUE.equals(layout.optionFitContent()));
    }

    private String normalizeAppearance(String value, String fallback) {
        String normalized = safeText(value).toLowerCase();
        return SettingSheetConstants.APPEARANCES.contains(normalized) ? normalized : fallback;
    }

    private String defaultAppearance(String type) {
        if (SettingSheetConstants.BLOCK_SECTION.equals(type)) {
            return SettingSheetConstants.APPEARANCE_PLAIN;
        }
        if (SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(type)) {
            return SettingSheetConstants.APPEARANCE_SUBTLE;
        }
        return SettingSheetConstants.APPEARANCE_OUTLINE;
    }

    private List<String> normalizeOptions(List<String> values, List<String> fallback) {
        if (values == null || values.isEmpty()) {
            return fallback;
        }
        List<String> normalized = values.stream().map(this::safeText).filter(value -> !value.isBlank()).distinct()
                .toList();
        return normalized.isEmpty() ? fallback : normalized;
    }

    private FormBlockResponse sectionBlock(String id, String label, String description) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_SECTION, label, description, false, false, false,
                SettingSheetConstants.APPEARANCE_PLAIN, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layoutFull(1), null);
    }

    private FormBlockResponse textBlock(String id, String label, boolean required, LayoutResponse layout) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_SHORT_TEXT, label, "", false, required, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layout, null);
    }

    private FormBlockResponse longTextBlock(String id, String label, boolean required, LayoutResponse layout) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_LONG_TEXT, label, "", false, required, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layout, null);
    }

    private FormBlockResponse booleanBlock(String id, String label, String description, LayoutResponse layout) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_BOOLEAN, label, description, false, false, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layout, null);
    }

    private FormBlockResponse selectBlock(String id, String type, String label, boolean required, List<String> options,
            OptionSourceResponse optionSource, LayoutResponse layout) {
        return new FormBlockResponse(id, type, label, "", false, required, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, options, 0, "", "",
                "",
                List.of(), layout, optionSource);
    }

    private FormBlockResponse groupBlock(String id, String label, String description, boolean required,
            boolean collapsible, int minItems, String addButtonLabel, String entryTitle, String titleSourceFieldId,
            LayoutResponse layout, List<FormBlockResponse> fields) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_REPEATABLE_GROUP, label, description, false,
                required, collapsible, SettingSheetConstants.APPEARANCE_SUBTLE,
                SettingSheetConstants.APPEARANCE_OUTLINE,
                List.of(), minItems, addButtonLabel, entryTitle, titleSourceFieldId, fields, layout, null);
    }

    private OptionSourceResponse optionSource(String blockId, String fieldId) {
        return new OptionSourceResponse(blockId, fieldId);
    }

    private LayoutResponse layoutFull(int optionColumns) {
        return new LayoutResponse(SettingSheetConstants.LAYOUT_FULL, optionColumns, false);
    }

    private LayoutResponse layoutHalf(int optionColumns) {
        return new LayoutResponse(SettingSheetConstants.LAYOUT_HALF, optionColumns, false);
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeTextOrDefault(String value, String fallback) {
        String sanitized = safeText(value);
        return sanitized.isBlank() ? fallback : sanitized;
    }
}