package com.objectifsperso.domain.model;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Un objectif perso et les jours où il a été tenu. */
public class Objectif {

    private final Long id;
    private final Long utilisateurId;
    private String nom;
    private Categorie categorie;
    private Frequence frequence;
    private LocalTime heure;
    private String couleur;
    private boolean archive;
    private final LocalDate dateCreation;
    private final List<Validation> validations;

    public Objectif(Long id, Long utilisateurId, String nom, Categorie categorie, Frequence frequence,
                    LocalTime heure, String couleur, boolean archive, LocalDate dateCreation,
                    List<Validation> validations) {
        this.id = id;
        this.utilisateurId = utilisateurId;
        this.dateCreation = dateCreation;
        this.archive = archive;
        this.validations = new ArrayList<>(validations == null ? List.of() : validations);
        modifier(nom, categorie, frequence, heure, couleur);
    }

    public static Objectif nouveau(Long utilisateurId, String nom, Categorie categorie, Frequence frequence,
                                   LocalTime heure, String couleur, LocalDate aujourdhui) {
        return new Objectif(null, utilisateurId, nom, categorie, frequence, heure, couleur, false, aujourdhui, List.of());
    }

    public final void modifier(String nom, Categorie categorie, Frequence frequence, LocalTime heure, String couleur) {
        if (nom == null || nom.isBlank()) throw new IllegalArgumentException("Le nom est obligatoire");
        if (categorie == null) throw new IllegalArgumentException("La catégorie est obligatoire");
        if (frequence == null) throw new IllegalArgumentException("La fréquence est obligatoire");
        if (heure == null) throw new IllegalArgumentException("L'heure est obligatoire");
        this.nom = nom.trim();
        this.categorie = categorie;
        this.frequence = frequence;
        this.heure = heure;
        this.couleur = couleur == null ? "#ffffff" : couleur;
    }

    /** Coche l'objectif pour une date ; si elle est déjà cochée, les détails sont remplacés. */
    public void valider(LocalDate date, DetailsSeance details, LocalDate aujourdhui) {
        if (date.isAfter(aujourdhui)) throw new IllegalArgumentException("On ne peut pas cocher un jour futur");
        validations.removeIf(v -> v.date().equals(date));
        validations.add(new Validation(date, details));
    }

    public void annuler(LocalDate date) {
        validations.removeIf(v -> v.date().equals(date));
    }

    public void archiver() { this.archive = true; }

    public boolean estFaitLe(LocalDate date) {
        return validations.stream().anyMatch(v -> v.date().equals(date));
    }

    public List<Validation> validationsDe(Semaine semaine) {
        return validations.stream().filter(v -> semaine.contient(v.date()))
                .sorted(Comparator.comparing(Validation::date)).toList();
    }

    public Optional<LocalDate> premiereDate() {
        return validations.stream().map(Validation::date).min(Comparator.naturalOrder())
                .map(d -> d.isBefore(dateCreation) ? d : dateCreation)
                .or(() -> Optional.of(dateCreation));
    }

    /** Heure du rappel : celle choisie, ou 30 min avant l'heure de coucher visée pour le sommeil. */
    public LocalTime heureRappel() {
        return categorie == Categorie.SOMMEIL ? heure.minusMinutes(30) : heure;
    }

    public Long id() { return id; }
    public Long utilisateurId() { return utilisateurId; }
    public String nom() { return nom; }
    public Categorie categorie() { return categorie; }
    public Frequence frequence() { return frequence; }
    public LocalTime heure() { return heure; }
    public String couleur() { return couleur; }
    public boolean archive() { return archive; }
    public LocalDate dateCreation() { return dateCreation; }
    public List<Validation> validations() { return List.copyOf(validations); }
}
