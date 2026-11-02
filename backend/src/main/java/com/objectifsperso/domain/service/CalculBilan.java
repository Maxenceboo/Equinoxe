package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Bilan;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.Semaine;
import com.objectifsperso.domain.model.Validation;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/** Bilan de la semaine : objectifs tenus, séances, comparaison avec la semaine d'avant. */
public class CalculBilan {

    private final CalculProgression progression;
    private final ConseilCible conseil;

    public CalculBilan(CalculProgression progression, ConseilCible conseil) {
        this.progression = progression;
        this.conseil = conseil;
    }

    public Bilan bilan(List<Objectif> objectifs, Semaine semaine, LocalDate aujourdhui) {
        LocalDate finVue = semaine.dimanche().isBefore(aujourdhui) ? semaine.dimanche() : aujourdhui;
        List<Objectif> actifs = objectifs.stream()
                .filter(o -> !o.archive() && !o.premiereDate().orElse(o.dateCreation()).isAfter(semaine.dimanche()))
                .toList();
        List<Bilan.Ligne> lignes = actifs.stream().map(o -> {
            List<Validation> faites = o.validationsDe(semaine);
            int cible = o.frequence().parSemaine();
            Double quantite = o.mesure() == null ? null : somme(faites);
            return new Bilan.Ligne(o.id(), o.nom(), o.categorie(), faites.size(), cible, faites.size() >= cible,
                    progression.serie(o, finVue), o.mesure(), quantite,
                    conseil.suggestion(o, aujourdhui).orElse(null));
        }).toList();

        int tenus = (int) lignes.stream().filter(Bilan.Ligne::atteint).count();
        int seances = lignes.stream().mapToInt(Bilan.Ligne::realisees).sum();
        int avant = actifs.stream().mapToInt(o -> o.validationsDe(semaine.precedente()).size()).sum();
        return new Bilan(semaine.lundi(), lignes, tenus, lignes.size(), seances, avant,
                phrase(tenus, lignes.size(), seances, avant));
    }

    static Double somme(List<Validation> validations) {
        return validations.stream().map(Validation::quantite).filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue).sum();
    }

    private static String phrase(int tenus, int total, int seances, int avant) {
        if (total == 0) return "Aucun objectif cette semaine.";
        String base;
        if (tenus == total) base = total == 1 ? "Objectif tenu cette semaine, bravo !" : "Tous tes objectifs tenus, bravo !";
        else if (tenus == 0) base = "Semaine plus calme. On repart lundi.";
        else base = tenus + " objectif" + (tenus > 1 ? "s" : "") + " sur " + total + " tenu" + (tenus > 1 ? "s" : "") + ".";
        if (avant > 0 && seances > avant) base += " Plus actif que la semaine d'avant.";
        return base;
    }
}
