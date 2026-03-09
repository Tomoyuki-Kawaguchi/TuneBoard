package jp.tubeboard.features.tenants.service.interfaces;

import java.util.List;
import java.util.UUID;

import jp.tubeboard.features.tenants.dto.request.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.request.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantsCreateResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsUpdateResponse;

public interface ITenantsService {
    public TenantsCreateResponse create(TenantsCreateRequest request);

    public TenantsUpdateResponse update(TenantsUpdateRequest request);

    public List<TenantsUpdateResponse> list();

    public TenantsUpdateResponse get(UUID tenantId);

    public void delete(UUID id);

}
