package jp.tubeboard.features.tenants.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.tenants.model.Tenants;

@Repository
public interface TenantsRepository extends JpaRepository<Tenants, UUID> {
    public List<Tenants> findAllDeletedAtIsNull();

    public Optional<Tenants> findByIdDeletedAtIsNull(UUID id);
}
