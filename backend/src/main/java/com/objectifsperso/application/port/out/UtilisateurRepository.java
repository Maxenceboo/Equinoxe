package com.objectifsperso.application.port.out;

import com.objectifsperso.domain.model.Utilisateur;

import java.util.Optional;

public interface UtilisateurRepository {
    Optional<Utilisateur> trouverParEmail(String email);

    Utilisateur enregistrer(Utilisateur utilisateur);
}
