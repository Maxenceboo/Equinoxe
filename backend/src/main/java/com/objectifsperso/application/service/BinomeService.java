package com.objectifsperso.application.service;

import com.objectifsperso.application.port.in.BinomesUseCase;
import com.objectifsperso.application.port.out.AbonnementRepository;
import com.objectifsperso.application.port.out.Horloge;
import com.objectifsperso.application.port.out.ObjectifRepository;
import com.objectifsperso.application.port.out.UtilisateurRepository;
import com.objectifsperso.domain.exception.CodeInconnuException;
import com.objectifsperso.domain.exception.ObjectifIntrouvableException;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.ObjectifSuivi;
import com.objectifsperso.domain.model.Partage;
import com.objectifsperso.domain.model.Utilisateur;
import com.objectifsperso.domain.service.CalculProgression;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/** Binôme : on partage un objectif par un code, l'ami voit la progression et la flamme. */
public class BinomeService implements BinomesUseCase {

    /** Sans 0/O ni 1/I pour un code facile à dicter. */
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int LONGUEUR_CODE = 6;

    private final ObjectifRepository objectifs;
    private final AbonnementRepository abonnements;
    private final UtilisateurRepository utilisateurs;
    private final Horloge horloge;
    private final CalculProgression calcul;
    private final SecureRandom hasard = new SecureRandom();

    public BinomeService(ObjectifRepository objectifs, AbonnementRepository abonnements,
                         UtilisateurRepository utilisateurs, Horloge horloge, CalculProgression calcul) {
        this.objectifs = objectifs;
        this.abonnements = abonnements;
        this.utilisateurs = utilisateurs;
        this.horloge = horloge;
        this.calcul = calcul;
    }

    @Override
    public Partage partager(Long utilisateurId, Long objectifId) {
        Objectif objectif = objectifs.trouver(utilisateurId, objectifId)
                .orElseThrow(() -> new ObjectifIntrouvableException(objectifId));
        if (objectif.codePartage() == null) {
            String code;
            do code = nouveauCode(); while (objectifs.trouverParCode(code).isPresent());
            objectif.partager(code);
            objectif = objectifs.enregistrer(objectif);
        }
        return new Partage(objectif.codePartage(), abonnements.nombreAbonnes(objectif.id()));
    }

    @Override
    public ObjectifSuivi rejoindre(Long utilisateurId, String code) {
        String normalise = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
        Objectif objectif = objectifs.trouverParCode(normalise)
                .filter(o -> !o.archive())
                .orElseThrow(() -> new CodeInconnuException(normalise));
        if (objectif.utilisateurId().equals(utilisateurId)) {
            throw new IllegalArgumentException("C'est ton propre objectif : partage ce code à un ami.");
        }
        if (!abonnements.objectifsSuivis(utilisateurId).contains(objectif.id())) {
            abonnements.ajouter(utilisateurId, objectif.id());
        }
        return suivi(objectif);
    }

    @Override
    public List<ObjectifSuivi> suivis(Long utilisateurId) {
        return abonnements.objectifsSuivis(utilisateurId).stream()
                .map(objectifs::trouverParId)
                .flatMap(Optional::stream)
                .filter(o -> !o.archive())
                .map(this::suivi)
                .toList();
    }

    @Override
    public void quitter(Long utilisateurId, Long objectifId) {
        abonnements.retirer(utilisateurId, objectifId);
    }

    private ObjectifSuivi suivi(Objectif o) {
        String ami = utilisateurs.trouverParId(o.utilisateurId()).map(BinomeService::prenom).orElse("Ton binôme");
        return new ObjectifSuivi(o.id(), o.nom(), ami, o.categorie(), calcul.progression(o, horloge.aujourdhui()));
    }

    /** On n'expose pas l'email complet : seulement ce qu'il y a avant l'arobase. */
    private static String prenom(Utilisateur u) {
        String local = u.email().split("@")[0];
        return local.isEmpty() ? "Ton binôme" : Character.toUpperCase(local.charAt(0)) + local.substring(1);
    }

    private String nouveauCode() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < LONGUEUR_CODE; i++) sb.append(ALPHABET.charAt(hasard.nextInt(ALPHABET.length())));
        return sb.toString();
    }
}
