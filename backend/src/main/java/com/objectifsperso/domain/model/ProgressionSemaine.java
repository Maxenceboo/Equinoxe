package com.objectifsperso.domain.model;

import java.time.LocalDate;

public record ProgressionSemaine(
        LocalDate debutSemaine,
        int realisees,
        int cible,
        boolean atteint,
        int joursRestants,
        boolean faitAujourdhui,
        String message) {
}
