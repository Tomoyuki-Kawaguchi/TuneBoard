package jp.tubeboard.features.tenants.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jp.tubeboard.features.tenants.dto.requeest.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.requeest.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantsCreateResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsUpdateResponse;
import jp.tubeboard.features.tenants.service.TenantsService;
import lombok.AllArgsConstructor;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/tenants")
@AllArgsConstructor
public class TenantsController {

    private final TenantsService tenantsService;

    @PostMapping("/create")
    public ResponseEntity<TenantsCreateResponse> create(@RequestBody TenantsCreateRequest request) {
        final TenantsCreateResponse tenant = tenantsService.create(request);
        return ResponseEntity.ok(tenant);
    }

    @PostMapping("/update")
    public ResponseEntity<TenantsUpdateResponse> update(@RequestBody TenantsUpdateRequest request) {
        final TenantsUpdateResponse updatedTenant = tenantsService.update(request);
        return ResponseEntity.ok(updatedTenant);
    }

}
