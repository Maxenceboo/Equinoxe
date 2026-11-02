package com.objectifsperso.application.port.out;

import com.objectifsperso.domain.model.Utilisateur;

import java.util.Optional;

public interface UtilisateurRepository {
    Optional<Utilisateur> trouverParEmail(String email);

    Optional<Utilisateur> trouverParId(Long id);

    Utilisateur enregistrer(Utilisateur utilisateur);
}
