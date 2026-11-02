package com.objectifsperso.adapter.in.web;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Lit l'identifiant de l'utilisateur dans le jeton JWT de la requête. */
@Component
class UtilisateurCourant {

    Long id() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof Jwt jwt) return Long.valueOf(jwt.getSubject());
        throw new IllegalStateException("Utilisateur non authentifié");
    }
}
