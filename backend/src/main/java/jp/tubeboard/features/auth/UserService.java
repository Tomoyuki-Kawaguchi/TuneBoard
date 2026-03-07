package jp.tubeboard.features.auth;

import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User saveOrUpdateFromGoogleUserInfo(Map<String, Object> userInfo) {
        String sub = toStringOrEmpty(userInfo.get("sub"));
        if (sub.isBlank()) {
            throw new IllegalArgumentException("Google user sub is missing");
        }

        User user = userRepository.findBySubAndDeletedAtIsNull(sub)
                .orElseGet(() -> User.builder().sub(sub).build());

        user.setEmail(toStringOrEmpty(userInfo.get("email")));
        user.setName(toStringOrEmpty(userInfo.get("name")));
        user.setPicture(toStringOrEmpty(userInfo.get("picture")));
        user.setDeletedAt(null);

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Map<?, ?> claims)) {
            throw new IllegalStateException("Authenticated user not found");
        }

        String sub = toStringOrEmpty(claims.get("sub"));
        if (sub.isBlank()) {
            throw new IllegalStateException("Authenticated user sub is missing");
        }

        return userRepository.findBySubAndDeletedAtIsNull(sub)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in database"));
    }

    private String toStringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
