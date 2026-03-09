package jp.tubeboard.features.lives.service.interfaces;

import java.util.List;
import java.util.UUID;

import jp.tubeboard.features.lives.dto.request.LiveCreateRequest;
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;

public interface ILivesService {

    LiveResponse create(LiveCreateRequest request);

    List<LiveResponse> list();

    List<LiveResponse> listByTenant(UUID tenantId);

    LiveResponse get(UUID id);

    LiveResponse update(LiveUpdateRequest request);

    void delete(UUID id);

    PublicLiveResponse findPublicLive(String publicToken);
}