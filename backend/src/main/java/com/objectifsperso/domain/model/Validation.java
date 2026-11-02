package com.objectifsperso.domain.model;

import java.time.LocalDate;

/** Un objectif coché pour un jour donné. */
public record Validation(LocalDate date, DetailsSeance details) {

    public Validation {
        if (date == null) throw new IllegalArgumentException("La date est obligatoire");
        if (details == null) details = DetailsSeance.AUCUN;
    }
}
