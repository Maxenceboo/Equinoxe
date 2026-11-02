package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.Statistiques;
import com.objectifsperso.domain.model.Validation;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Totaux, évolution mois par mois (6 derniers mois) et types de séance les plus fréquents. */
public class CalculStatistiques {

    public static final int MOIS_AFFICHES = 6;

    public Statistiques statistiques(Objectif objectif, LocalDate aujourdhui) {
        List<Validation> toutes = objectif.validations();
        int minutes = toutes.stream().map(v -> v.details().dureeMinutes()).filter(Objects::nonNull)
                .mapToInt(Integer::intValue).sum();
        Double quantite = objectif.mesure() == null ? null : CalculBilan.somme(toutes);

        long semaines = ChronoUnit.WEEKS.between(objectif.premiereDate().orElse(aujourdhui), aujourdhui) + 1;
        double moyenne = Math.round(toutes.size() * 10.0 / Math.max(1, semaines)) / 10.0;

        List<Statistiques.Mois> mois = new ArrayList<>();
        YearMonth courant = YearMonth.from(aujourdhui);
        for (int i = MOIS_AFFICHES - 1; i >= 0; i--) {
            YearMonth m = courant.minusMonths(i);
            List<Validation> duMois = toutes.stream().filter(v -> YearMonth.from(v.date()).equals(m)).toList();
            mois.add(new Statistiques.Mois(m, duMois.size(),
                    duMois.stream().map(v -> v.details().dureeMinutes()).filter(Objects::nonNull)
                            .mapToInt(Integer::intValue).sum(),
                    objectif.mesure() == null ? null : CalculBilan.somme(duMois)));
        }

        Map<String, Integer> parType = new LinkedHashMap<>();
        toutes.stream().map(v -> v.details().typeSeance()).filter(Objects::nonNull)
                .forEach(t -> parType.merge(t, 1, Integer::sum));
        List<Statistiques.Repartition> types = parType.entrySet().stream()
                .map(e -> new Statistiques.Repartition(e.getKey(), e.getValue()))
                .sorted(Comparator.comparingInt(Statistiques.Repartition::nombre).reversed())
                .toList();

        return new Statistiques(toutes.size(), minutes, quantite, objectif.mesure(), moyenne, mois, types);
    }
}
