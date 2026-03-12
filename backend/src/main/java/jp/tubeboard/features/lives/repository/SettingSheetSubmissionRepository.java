package jp.tubeboard.features.lives.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.SettingSheetSubmission;

@Repository
public interface SettingSheetSubmissionRepository extends JpaRepository<SettingSheetSubmission, UUID> {

	Optional<SettingSheetSubmission> findByIdAndLivePublicTokenAndLiveDeletedAtIsNull(UUID id, String publicToken);
}