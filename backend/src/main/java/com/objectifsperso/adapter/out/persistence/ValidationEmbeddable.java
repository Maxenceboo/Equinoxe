package com.objectifsperso.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.LocalDate;

@Embeddable
class ValidationEmbeddable {

    @Column(name = "jour", nullable = false)
    LocalDate date;

    String typeSeance;
    Integer dureeMinutes;
    String ressenti;
    String ponctualite;
    String reveil;
}
