package jp.tubeboard.features.lives.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.lives.dto.request.LiveCreateRequest;
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.service.interfaces.ILivesService;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
@Transactional(readOnly = true)
public class LivesService implements ILivesService {

    private final LiveRepository liveRepository;
    private final TenantsRepository tenantsRepository;
    private final UserService userService;

    @Override
    @Transactional
    public LiveResponse create(LiveCreateRequest request) {
        User currentUser = userService.getCurrentUser();
        Tenants tenant = findTenant(request.tenantId(), currentUser.getId());

        Live live = Live.builder()
                .tenant(tenant)
                .publicToken(UUID.randomUUID().toString())
                .name(request.name())
                .date(request.date())
                .location(request.location())
                .deadlineAt(request.deadlineAt())
                .status(resolveStatus(request.status()))
                .build();

        return toResponse(liveRepository.save(live));
    }

    @Override
    public List<LiveResponse> list() {
        User currentUser = userService.getCurrentUser();

        return liveRepository.findAllByTenantUserIdAndDeletedAtIsNullOrderByDateAscCreatedAtDesc(currentUser.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<LiveResponse> listByTenant(UUID tenantId) {
        User currentUser = userService.getCurrentUser();
        findTenant(tenantId, currentUser.getId());

        return liveRepository
                .findAllByTenantIdAndTenantUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId, currentUser.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public LiveResponse get(UUID id) {
        User currentUser = userService.getCurrentUser();
        Live live = liveRepository.findByIdAndTenantUserIdAndDeletedAtIsNull(id, currentUser.getId())
                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));

        return toResponse(live);
    }

    @Override
    @Transactional
    public LiveResponse update(LiveUpdateRequest request) {
        User currentUser = userService.getCurrentUser();
        Live live = liveRepository.findByIdAndTenantUserIdAndDeletedAtIsNull(request.id(), currentUser.getId())
                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));

        live.setName(request.name());
        live.setDate(request.date());
        live.setLocation(request.location());
        live.setDeadlineAt(request.deadlineAt());
        live.setStatus(resolveStatus(request.status()));

        return toResponse(liveRepository.save(live));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        User currentUser = userService.getCurrentUser();
        Live live = liveRepository.findByIdAndTenantUserIdAndDeletedAtIsNull(id, currentUser.getId())
                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));

        live.markDeleted();
        liveRepository.save(live);
    }

    @Override
    public PublicLiveResponse findPublicLive(String publicToken) {
        Live live = liveRepository.findByPublicTokenAndDeletedAtIsNull(publicToken)
                .orElseThrow(() -> new LivesNotFoundException("公開ライブが見つかりません"));

        return new PublicLiveResponse(
                live.getName(),
                live.getDate(),
                live.getLocation(),
                live.getDeadlineAt(),
                live.getStatus());
    }

    private Tenants findTenant(UUID tenantId, Long userId) {
        return tenantsRepository.findByIdAndUserIdAndDeletedAtIsNull(tenantId, userId)
                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));
    }

    private LiveStatus resolveStatus(LiveStatus status) {
        return status == null ? LiveStatus.DRAFT : status;
    }

    private LiveResponse toResponse(Live live) {
        return new LiveResponse(
                live.getId(),
                live.getTenant().getId(),
                live.getTenant().getName(),
                live.getPublicToken(),
                live.getName(),
                live.getDate(),
                live.getLocation(),
                live.getDeadlineAt(),
                live.getStatus());
    }
}