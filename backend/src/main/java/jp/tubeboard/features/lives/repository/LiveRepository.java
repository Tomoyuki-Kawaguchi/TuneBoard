package jp.tubeboard.features.lives.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.Live;

@Repository
public interface LiveRepository extends JpaRepository<Live, UUID> {

    List<Live> findAllByTenantUserIdAndDeletedAtIsNullOrderByDateAscCreatedAtDesc(Long userId);

    List<Live> findAllByTenantIdAndTenantUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID tenantId, Long userId);

    Optional<Live> findByIdAndTenantUserIdAndDeletedAtIsNull(UUID id, Long userId);

    Optional<Live> findByPublicTokenAndDeletedAtIsNull(String publicToken);
}