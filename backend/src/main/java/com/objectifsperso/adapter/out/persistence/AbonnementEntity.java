package com.objectifsperso.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "binome", uniqueConstraints = @UniqueConstraint(columnNames = {"utilisateur_id", "objectif_id"}))
class AbonnementEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "utilisateur_id", nullable = false)
    Long utilisateurId;

    @Column(name = "objectif_id", nullable = false)
    Long objectifId;
}
