package com.objectifsperso.domain.model;

import java.time.YearMonth;
import java.util.List;

public record Historique(
        YearMonth mois,
        List<Validation> validations,
        int serieSemaines,
        int meilleureSerie,
        int semainesReussies,
        int semainesTotales,
        double tauxReussite) {
}
