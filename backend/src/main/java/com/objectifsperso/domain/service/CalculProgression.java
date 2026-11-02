package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Historique;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.ProgressionSemaine;
import com.objectifsperso.domain.model.Semaine;
import com.objectifsperso.domain.model.Validation;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/** Règles de progression : semaine en cours, séries et taux de réussite. */
public class CalculProgression {

    public ProgressionSemaine progression(Objectif objectif, LocalDate aujourdhui) {
        Semaine semaine = Semaine.de(aujourdhui);
        int realisees = objectif.validationsDe(semaine).size();
        int cible = objectif.frequence().parSemaine();
        boolean atteint = realisees >= cible;
        int joursRestants = (int) ChronoUnit.DAYS.between(aujourdhui, semaine.dimanche()) + 1;
        boolean faitAujourdhui = objectif.estFaitLe(aujourdhui);
        return new ProgressionSemaine(semaine.lundi(), realisees, cible, atteint, joursRestants, faitAujourdhui,
                message(realisees, cible, joursRestants, faitAujourdhui));
    }

    private String message(int realisees, int cible, int joursRestants, boolean faitAujourdhui) {
        if (realisees >= cible) return "Objectif de la semaine atteint, bravo !";
        int restantes = cible - realisees;
        int joursDisponibles = faitAujourdhui ? joursRestants - 1 : joursRestants;
        if (restantes > joursDisponibles) {
            return realisees + "/" + cible + " cette semaine, on repart lundi.";
        }
        return "Encore " + restantes + " cette semaine, il reste " + joursRestants
                + (joursRestants > 1 ? " jours." : " jour.");
    }

    public Historique historique(Objectif objectif, YearMonth mois, LocalDate aujourdhui) {
        List<Validation> duMois = objectif.validations().stream()
                .filter(v -> YearMonth.from(v.date()).equals(mois))
                .sorted(Comparator.comparing(Validation::date))
                .toList();

        int cible = objectif.frequence().parSemaine();
        Semaine courante = Semaine.de(aujourdhui);
        Semaine semaine = Semaine.de(objectif.premiereDate().orElse(aujourdhui));

        int reussies = 0;
        int totales = 0;
        int serie = 0;
        int meilleure = 0;
        while (!semaine.lundi().isAfter(courante.lundi())) {
            boolean reussie = objectif.validationsDe(semaine).size() >= cible;
            boolean enCours = semaine.equals(courante);
            if (reussie) {
                reussies++;
                totales++;
                serie++;
                meilleure = Math.max(meilleure, serie);
            } else if (!enCours) {
                // Une semaine en cours pas encore réussie ne casse pas la série.
                totales++;
                serie = 0;
            }
            semaine = semaine.suivante();
        }
        double taux = totales == 0 ? 0 : (double) reussies / totales;
        return new Historique(mois, duMois, serie, meilleure, reussies, totales, taux);
    }
}
