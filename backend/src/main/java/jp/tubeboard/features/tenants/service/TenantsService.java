package jp.tubeboard.features.tenants.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.tenants.dto.request.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.request.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantResponse;
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
        private final UserService userService;

        @Override
        public TenantsCreateResponse create(TenantsCreateRequest request) {
                User currentUser = userService.getCurrentUser();

                Tenants savedTenants = tenantsRepository.save(Tenants.builder()
                                .name(request.name())
                                .user(currentUser)
                                .build());

                return TenantsCreateResponse.builder()
                                .id(savedTenants.getId())
                                .name(savedTenants.getName())
                                .build();
        }

        @Override
        public TenantsUpdateResponse update(TenantsUpdateRequest request) {
                User currentUser = userService.getCurrentUser();

                Tenants tenants = tenantsRepository
                                .findByIdAndUserIdAndDeletedAtIsNull(request.id(), currentUser.getId())
                                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));

                tenants.setName(request.name());
                Tenants updatedTenants = tenantsRepository.save(tenants);

                return TenantsUpdateResponse.builder()
                                .id(updatedTenants.getId())
                                .name(updatedTenants.getName())
                                .build();
        }

        @Override
        public List<TenantResponse> list() {
                User currentUser = userService.getCurrentUser();

                List<Tenants> tenantsList = tenantsRepository.findAllByUserIdAndDeletedAtIsNull(currentUser.getId());
                return tenantsList.stream().map(tenants -> TenantResponse.builder()
                                .id(tenants.getId())
                                .name(tenants.getName())
                                .build()).toList();
        }

        @Override
        public TenantResponse get(UUID tenantId) {
                User currentUser = userService.getCurrentUser();
                Tenants optionalTenants = tenantsRepository.findByIdAndUserIdAndDeletedAtIsNull(tenantId,
                                currentUser.getId()).orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));
                return TenantResponse.builder()
                                .id(optionalTenants.getId())
                                .name(optionalTenants.getName())
                                .build();
        }

        @Override
        public void delete(UUID id) {
                User currentUser = userService.getCurrentUser();

                Tenants tenants = tenantsRepository.findByIdAndUserIdAndDeletedAtIsNull(id, currentUser.getId())
                                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));

                tenants.setDeletedAt(LocalDateTime.now());
                tenantsRepository.save(tenants);
        }

}
