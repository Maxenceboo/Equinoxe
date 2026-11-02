package com.objectifsperso.domain.model;

import java.time.YearMonth;
import java.util.List;

/** Statistiques d'un objectif depuis sa création. */
public record Statistiques(int totalSeances, int totalMinutes, Double totalQuantite, Mesure mesure,
                           double moyenneParSemaine, List<Mois> mois, List<Repartition> types) {

    public record Mois(YearMonth mois, int seances, int minutes, Double quantite) {
    }

    public record Repartition(String type, int nombre) {
    }
}
