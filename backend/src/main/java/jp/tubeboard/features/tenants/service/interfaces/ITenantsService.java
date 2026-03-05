package jp.tubeboard.features.tenants.service.interfaces;

import jp.tubeboard.features.tenants.dto.requeest.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.requeest.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantsCreateResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsUpdateResponse;

public interface ITenantsService {
    public TenantsCreateResponse create(TenantsCreateRequest request);

    public TenantsUpdateResponse update(TenantsUpdateRequest request);

}
