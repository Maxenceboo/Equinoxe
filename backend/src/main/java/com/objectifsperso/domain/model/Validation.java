package com.objectifsperso.domain.model;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Un objectif coché pour un jour donné. L'heure n'est connue que si la coche a été faite le jour même :
 * elle sert à apprendre l'heure habituelle. La quantité sert aux objectifs chiffrés.
 */
public record Validation(LocalDate date, DetailsSeance details, LocalTime heure, Double quantite) {

    public Validation {
        if (date == null) throw new IllegalArgumentException("La date est obligatoire");
        if (details == null) details = DetailsSeance.AUCUN;
        if (quantite != null && (quantite < 0 || quantite > 100_000)) {
            throw new IllegalArgumentException("Quantité invalide");
        }
    }

    public Validation(LocalDate date, DetailsSeance details) {
        this(date, details, null, null);
    }
}
