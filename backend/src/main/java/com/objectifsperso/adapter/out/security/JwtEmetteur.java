package com.objectifsperso.adapter.out.security;

import com.objectifsperso.application.port.out.EmetteurJeton;
import com.objectifsperso.domain.model.Utilisateur;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
class JwtEmetteur implements EmetteurJeton {

    private final JwtEncoder encoder;
    private final Duration duree;

    JwtEmetteur(JwtEncoder encoder, @Value("${app.jwt.duree-jours:30}") long dureeJours) {
        this.encoder = encoder;
        this.duree = Duration.ofDays(dureeJours);
    }

    @Override
    public String emettre(Utilisateur utilisateur) {
        Instant maintenant = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("objectifs-perso")
                .subject(String.valueOf(utilisateur.id()))
                .claim("email", utilisateur.email())
                .issuedAt(maintenant)
                .expiresAt(maintenant.plus(duree))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
