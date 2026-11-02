package com.objectifsperso.adapter.out.persistence;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import com.objectifsperso.domain.model.Categorie;
import com.objectifsperso.domain.model.Mesure;
import com.objectifsperso.domain.model.TypeFrequence;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "objectif")
class ObjectifEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "utilisateur_id", nullable = false)
    Long utilisateurId;

    @Column(nullable = false, length = 50)
    String nom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    Categorie categorie;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_frequence", nullable = false)
    TypeFrequence typeFrequence;

    @Column(nullable = false)
    int cible;

    @Column(nullable = false)
    LocalTime heure;

    @Column(nullable = false, length = 7)
    String couleur;

    @Column(nullable = false)
    boolean archive;

    @Column(name = "date_creation", nullable = false)
    LocalDate dateCreation;

    @Enumerated(EnumType.STRING)
    Mesure mesure;

    @Column(name = "objectif_quantite")
    Double objectifQuantite;

    /** Colonnes ajoutées après coup : nullables pour les bases existantes. */
    @Column(name = "rappel_auto")
    Boolean rappelAuto;

    @Column(name = "cible_depuis")
    LocalDate cibleDepuis;

    @Column(name = "code_partage", unique = true, length = 12)
    String codePartage;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "validation", joinColumns = @JoinColumn(name = "objectif_id"))
    List<ValidationEmbeddable> validations = new ArrayList<>();
}
