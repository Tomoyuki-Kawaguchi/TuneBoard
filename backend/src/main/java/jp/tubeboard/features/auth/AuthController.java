package jp.tubeboard.features.auth;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtTokenService jwtTokenService;
    private final GoogleOAuthService googleOAuthService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public AuthController(JwtTokenService jwtTokenService, GoogleOAuthService googleOAuthService) {
        this.jwtTokenService = jwtTokenService;
        this.googleOAuthService = googleOAuthService;
    }

    @GetMapping("/google/login")
    public ResponseEntity<Void> googleLogin(
            @RequestParam(value = "redirect", required = false) String redirectUrl) {
        String frontendRedirect = isBlank(redirectUrl) ? frontendBaseUrl : redirectUrl;
        String state = jwtTokenService.generateOAuthState(frontendRedirect);
        String authorizationUrl = googleOAuthService.buildAuthorizationUrl(state);

        return ResponseEntity.status(302)
                .location(URI.create(authorizationUrl))
                .build();
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> googleCallback(
            @RequestParam("code") String code,
            @RequestParam("state") String state) {
        String frontendRedirect;
        try {
            frontendRedirect = jwtTokenService.extractFrontendRedirectFromState(state);
        } catch (Exception ex) {
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBaseUrl + "?login=error"))
                    .build();
        }

        Map<String, Object> userInfo;
        try {
            userInfo = googleOAuthService.exchangeCodeForUserInfo(code);
        } catch (Exception ex) {
            return ResponseEntity.status(302)
                    .location(URI.create(frontendRedirect + "?login=error"))
                    .build();
        }

        String email = toStringOrEmpty(userInfo.get("email"));
        String name = toStringOrEmpty(userInfo.get("name"));
        String picture = toStringOrEmpty(userInfo.get("picture"));
        String token = jwtTokenService.generateToken(name, email, picture);

        String separator = frontendRedirect.contains("?") ? "&" : "?";
        String redirectToFrontend = frontendRedirect
                + separator
                + "login=success#token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);

        return ResponseEntity.status(302)
                .location(URI.create(redirectToFrontend))
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal Object principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "authenticated", false));
        }

        String email = "";
        String name = "";
        String picture = "";

        if (principal instanceof Map<?, ?> claims) {
            email = toStringOrEmpty(claims.get("email"));
            name = toStringOrEmpty(claims.get("name"));
            picture = toStringOrEmpty(claims.get("picture"));
        } else {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "name", name,
                "email", email,
                "picture", picture));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie deleteJsessionId = ResponseCookie.from("JSESSIONID", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .build();

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, deleteJsessionId.toString())
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String toStringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
