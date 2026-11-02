package com.objectifsperso.domain.model;

import java.time.LocalTime;

/**
 * Ce que l'utilisateur choisit pour un objectif.
 *
 * @param mesure           unité si l'objectif est chiffré (km, pages, minutes), sinon null
 * @param objectifQuantite total visé par semaine dans cette unité (facultatif)
 * @param rappelAuto       rappel calé sur l'heure à laquelle l'objectif est d'habitude coché
 */
public record Reglages(String nom, Categorie categorie, Frequence frequence, LocalTime heure, String couleur,
                       Mesure mesure, Double objectifQuantite, boolean rappelAuto) {

    public Reglages {
        if (nom == null || nom.isBlank()) throw new IllegalArgumentException("Le nom est obligatoire");
        if (categorie == null) throw new IllegalArgumentException("La catégorie est obligatoire");
        if (frequence == null) throw new IllegalArgumentException("La fréquence est obligatoire");
        if (heure == null) throw new IllegalArgumentException("L'heure est obligatoire");
        nom = nom.trim();
        if (couleur == null) couleur = "#ffffff";
        if (mesure == null) objectifQuantite = null;
        if (objectifQuantite != null && objectifQuantite <= 0) objectifQuantite = null;
    }

    public static Reglages simples(String nom, Categorie categorie, Frequence frequence, LocalTime heure, String couleur) {
        return new Reglages(nom, categorie, frequence, heure, couleur, null, null, false);
    }

    public Reglages avecCible(int cible) {
        return new Reglages(nom, categorie, new Frequence(frequence.type(), cible), heure, couleur, mesure,
                objectifQuantite, rappelAuto);
    }
}
