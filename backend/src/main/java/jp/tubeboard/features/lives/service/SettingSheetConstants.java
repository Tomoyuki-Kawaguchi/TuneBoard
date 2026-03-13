package jp.tubeboard.features.lives.service;

import java.util.Set;

final class SettingSheetConstants {
        static final String SUBMISSION_STATUS = "SUBMITTED";

        static final String LAYOUT_FULL = "full";
        static final String LAYOUT_TWO_THIRDS = "two-thirds";
        static final String LAYOUT_HALF = "half";
        static final String LAYOUT_THIRD = "third";

        static final String APPEARANCE_PLAIN = "plain";
        static final String APPEARANCE_OUTLINE = "outline";
        static final String APPEARANCE_SUBTLE = "subtle";

        static final String BLOCK_SECTION = "SECTION";
        static final String BLOCK_SHORT_TEXT = "SHORT_TEXT";
        static final String BLOCK_LONG_TEXT = "LONG_TEXT";
        static final String BLOCK_SINGLE_SELECT = "SINGLE_SELECT";
        static final String BLOCK_MULTI_SELECT = "MULTI_SELECT";
        static final String BLOCK_CHECKBOX = "CHECKBOX";
        static final String BLOCK_BOOLEAN = "BOOLEAN";
        static final String BLOCK_REPEATABLE_GROUP = "REPEATABLE_GROUP";

        static final Set<String> SUPPORTED_BLOCK_TYPES = Set.of(
                        BLOCK_SECTION,
                        BLOCK_SHORT_TEXT,
                        BLOCK_LONG_TEXT,
                        BLOCK_SINGLE_SELECT,
                        BLOCK_MULTI_SELECT,
                        BLOCK_CHECKBOX,
                        BLOCK_BOOLEAN,
                        BLOCK_REPEATABLE_GROUP);
        static final Set<String> OPTION_BLOCK_TYPES = Set.of(
                        BLOCK_SINGLE_SELECT,
                        BLOCK_MULTI_SELECT,
                        BLOCK_CHECKBOX);
        static final Set<String> VALUE_BLOCK_TYPES = Set.of(
                        BLOCK_SHORT_TEXT,
                        BLOCK_LONG_TEXT,
                        BLOCK_SINGLE_SELECT,
                        BLOCK_MULTI_SELECT,
                        BLOCK_CHECKBOX,
                        BLOCK_BOOLEAN);
        static final Set<String> LAYOUT_WIDTHS = Set.of(
                        LAYOUT_FULL,
                        LAYOUT_TWO_THIRDS,
                        LAYOUT_HALF,
                        LAYOUT_THIRD);
        static final Set<String> APPEARANCES = Set.of(
                        APPEARANCE_PLAIN,
                        APPEARANCE_OUTLINE,
                        APPEARANCE_SUBTLE);

        private SettingSheetConstants() {
        }
}