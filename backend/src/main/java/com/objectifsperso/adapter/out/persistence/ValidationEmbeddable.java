package com.objectifsperso.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.LocalDate;
import java.time.LocalTime;

@Embeddable
class ValidationEmbeddable {

    @Column(name = "jour", nullable = false)
    LocalDate date;

    String typeSeance;
    Integer dureeMinutes;
    String ressenti;
    String ponctualite;
    String reveil;

    @Column(name = "heure_coche")
    LocalTime heure;

    Double quantite;
}
