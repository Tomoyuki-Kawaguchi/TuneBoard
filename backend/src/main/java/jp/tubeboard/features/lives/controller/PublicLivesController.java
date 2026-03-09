package jp.tubeboard.features.lives.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;
import jp.tubeboard.features.lives.service.interfaces.ILivesService;
import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/api/public/lives")
@AllArgsConstructor
public class PublicLivesController {

    private final ILivesService livesService;

    @GetMapping("/{publicToken}")
    public ResponseEntity<PublicLiveResponse> findByPublicToken(@PathVariable String publicToken) {
        return ResponseEntity.ok(livesService.findPublicLive(publicToken));
    }
}