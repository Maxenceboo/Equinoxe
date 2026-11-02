package com.objectifsperso.application.service;

import com.objectifsperso.application.port.in.AuthUseCase;
import com.objectifsperso.application.port.out.EmetteurJeton;
import com.objectifsperso.application.port.out.HacheurMotDePasse;
import com.objectifsperso.application.port.out.UtilisateurRepository;
import com.objectifsperso.domain.exception.EmailDejaUtiliseException;
import com.objectifsperso.domain.exception.IdentifiantsInvalidesException;
import com.objectifsperso.domain.model.Utilisateur;

import java.util.Locale;

public class AuthService implements AuthUseCase {

    private final UtilisateurRepository utilisateurs;
    private final HacheurMotDePasse hacheur;
    private final EmetteurJeton emetteur;

    public AuthService(UtilisateurRepository utilisateurs, HacheurMotDePasse hacheur, EmetteurJeton emetteur) {
        this.utilisateurs = utilisateurs;
        this.hacheur = hacheur;
        this.emetteur = emetteur;
    }

    @Override
    public SessionOuverte inscrire(String email, String motDePasse) {
        String normalise = normaliser(email);
        if (utilisateurs.trouverParEmail(normalise).isPresent()) throw new EmailDejaUtiliseException();
        Utilisateur cree = utilisateurs.enregistrer(new Utilisateur(null, normalise, hacheur.hacher(motDePasse)));
        return new SessionOuverte(emetteur.emettre(cree), cree.email());
    }

    @Override
    public SessionOuverte connecter(String email, String motDePasse) {
        Utilisateur u = utilisateurs.trouverParEmail(normaliser(email))
                .filter(trouve -> hacheur.correspond(motDePasse, trouve.motDePasseHache()))
                .orElseThrow(IdentifiantsInvalidesException::new);
        return new SessionOuverte(emetteur.emettre(u), u.email());
    }

    private static String normaliser(String email) { return email.trim().toLowerCase(Locale.ROOT); }
}
