package np.com.abhishekojha.coremonolith.modules.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import np.com.abhishekojha.coremonolith.config.JwtProperties;
import np.com.abhishekojha.coremonolith.modules.auth.model.UserEntity;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HexFormat;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationSeconds;

    public JwtService(JwtProperties props) {
        this.signingKey = Keys.hmacShaKeyFor(HexFormat.of().parseHex(props.getSecret()));
        this.expirationSeconds = props.getExpirationSeconds();
    }

    public String generateAccessToken(UserEntity user) {
        long nowMs = System.currentTimeMillis();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
//                .claim("tenantId", tenantId)
                .issuedAt(new Date(nowMs))
                .expiration(new Date(nowMs + expirationSeconds * 1000L))
                .signWith(signingKey)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).get("email", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
