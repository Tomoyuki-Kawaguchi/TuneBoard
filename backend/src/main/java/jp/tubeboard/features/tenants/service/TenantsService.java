package jp.tubeboard.features.tenants.service;

import org.springframework.stereotype.Service;

import jp.tubeboard.features.tenants.dto.requeest.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.requeest.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantsCreateResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsUpdateResponse;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.service.interfaces.ITenantsService;
import lombok.AllArgsConstructor;

@AllArgsConstructor
@Service
public class TenantsService implements ITenantsService {

    private final TenantsRepository tenantsRepository;

    @Override
    public TenantsCreateResponse create(TenantsCreateRequest request) {
        Tenants savedTenants = tenantsRepository.save(Tenants.builder().name(request.name()).build());

        return TenantsCreateResponse.builder()
                .id(savedTenants.getId())
                .name(savedTenants.getName())
                .build();
    }

    @Override
    public TenantsUpdateResponse update(TenantsUpdateRequest request) {
        Tenants tenants = tenantsRepository.findByIdDeletedAtIsNull(request.id())
                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));

        tenants.setName(request.name());
        Tenants updatedTenants = tenantsRepository.save(tenants);

        return TenantsUpdateResponse.builder()
                .id(updatedTenants.getId())
                .name(updatedTenants.getName())
                .build();
    }
}
