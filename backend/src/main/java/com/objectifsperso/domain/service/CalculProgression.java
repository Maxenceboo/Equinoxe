package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Historique;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.ProgressionSemaine;
import com.objectifsperso.domain.model.Semaine;
import com.objectifsperso.domain.model.Serie;
import com.objectifsperso.domain.model.TypeFrequence;
import com.objectifsperso.domain.model.Validation;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
                message(realisees, cible, joursRestants, faitAujourdhui), serie(objectif, aujourdhui),
                objectif.mesure() == null ? null : CalculBilan.somme(objectif.validationsDe(semaine)));
    }

    /** Nombre de jokers par mois et par objectif. */
    public static final int JOKERS_PAR_MOIS = 1;

    /**
     * Série en cours : jours d'affilée pour un objectif quotidien, semaines réussies d'affilée sinon.
     * Une journée (ou semaine) en cours pas encore faite ne casse pas la série.
     * Joker : un jour (ou une semaine) raté par mois ne casse pas la série ; il est utilisé automatiquement.
     */
    public Serie serie(Objectif objectif, LocalDate aujourdhui) {
        Set<YearMonth> jokersUtilises = new HashSet<>();
        if (objectif.frequence().type() == TypeFrequence.QUOTIDIEN) {
            LocalDate debut = objectif.premiereDate().orElse(aujourdhui);
            int enCours = 0;
            int record = 0;
            for (LocalDate d = debut; !d.isAfter(aujourdhui); d = d.plusDays(1)) {
                if (objectif.estFaitLe(d)) {
                    enCours++;
                    record = Math.max(record, enCours);
                } else if (!d.equals(aujourdhui) && !utiliserJoker(enCours, YearMonth.from(d), jokersUtilises)) {
                    enCours = 0;
                }
            }
            return new Serie(enCours, record, Serie.Unite.JOURS, jokersRestants(jokersUtilises, aujourdhui));
        }
        Historique h = historique(objectif, YearMonth.from(aujourdhui), aujourdhui, jokersUtilises);
        return new Serie(h.serieSemaines(), h.meilleureSerie(), Serie.Unite.SEMAINES,
                jokersRestants(jokersUtilises, aujourdhui));
    }

    /** Un joker ne sert que s'il y a une série à protéger, et une fois par mois. */
    private static boolean utiliserJoker(int serie, YearMonth mois, Set<YearMonth> utilises) {
        if (serie == 0 || utilises.contains(mois)) return false;
        utilises.add(mois);
        return true;
    }

    private static int jokersRestants(Set<YearMonth> utilises, LocalDate aujourdhui) {
        return utilises.contains(YearMonth.from(aujourdhui)) ? 0 : JOKERS_PAR_MOIS;
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
        return historique(objectif, mois, aujourdhui, new HashSet<>());
    }

    private Historique historique(Objectif objectif, YearMonth mois, LocalDate aujourdhui, Set<YearMonth> jokers) {
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
                // Une semaine en cours pas encore réussie ne casse pas la série ; une semaine ratée peut être
                // protégée par le joker du mois.
                totales++;
                if (!utiliserJoker(serie, YearMonth.from(semaine.lundi()), jokers)) serie = 0;
            }
            semaine = semaine.suivante();
        }
        double taux = totales == 0 ? 0 : (double) reussies / totales;
        return new Historique(mois, duMois, serie, meilleure, reussies, totales, taux);
    }
}
