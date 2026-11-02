package com.objectifsperso.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Un objectif perso et les jours où il a été tenu. */
public class Objectif {

    /** Nombre de coches avec une heure qu'il faut avant de proposer un rappel à l'heure habituelle. */
    public static final int COCHES_POUR_HEURE_HABITUELLE = 5;
    private static final int COCHES_PRISES_EN_COMPTE = 10;

    private final Long id;
    private final Long utilisateurId;
    private Reglages reglages;
    private boolean archive;
    private final LocalDate dateCreation;
    /**
     * Date du dernier changement de cible (null s'il n'a jamais changé) : les conseils de cible ne regardent
     * que les semaines d'après.
     */
    private LocalDate cibleDepuis;
    private String codePartage;
    private final List<Validation> validations;

    public Objectif(Long id, Long utilisateurId, Reglages reglages, boolean archive, LocalDate dateCreation,
                    LocalDate cibleDepuis, String codePartage, List<Validation> validations) {
        this.id = id;
        this.utilisateurId = utilisateurId;
        this.reglages = Objects.requireNonNull(reglages);
        this.archive = archive;
        this.dateCreation = dateCreation;
        this.cibleDepuis = cibleDepuis;
        this.codePartage = codePartage;
        this.validations = new ArrayList<>(validations == null ? List.of() : validations);
    }

    public Objectif(Long id, Long utilisateurId, String nom, Categorie categorie, Frequence frequence,
                    LocalTime heure, String couleur, boolean archive, LocalDate dateCreation,
                    List<Validation> validations) {
        this(id, utilisateurId, Reglages.simples(nom, categorie, frequence, heure, couleur), archive, dateCreation,
                null, null, validations);
    }

    public static Objectif nouveau(Long utilisateurId, Reglages reglages, LocalDate aujourdhui) {
        return new Objectif(null, utilisateurId, reglages, false, aujourdhui, null, null, List.of());
    }

    public void modifier(Reglages nouveaux, LocalDate aujourdhui) {
        if (nouveaux.frequence().cible() != reglages.frequence().cible()
                || nouveaux.frequence().type() != reglages.frequence().type()) {
            cibleDepuis = aujourdhui;
        }
        this.reglages = Objects.requireNonNull(nouveaux);
    }

    /** Coche l'objectif pour une date ; si elle est déjà cochée, les détails fournis remplacent les anciens. */
    public void valider(LocalDate date, DetailsSeance details, LocalDate aujourdhui) {
        valider(date, details, null, aujourdhui.atTime(LocalTime.NOON), false);
    }

    /** Coche avec une quantité ; l'heure de la coche n'est gardée que si on coche le jour même. */
    public void valider(LocalDate date, DetailsSeance details, Double quantite, LocalDateTime maintenant) {
        valider(date, details, quantite, maintenant, true);
    }

    private void valider(LocalDate date, DetailsSeance details, Double quantite, LocalDateTime maintenant,
                         boolean noterHeure) {
        LocalDate aujourdhui = maintenant.toLocalDate();
        if (date.isAfter(aujourdhui)) throw new IllegalArgumentException("On ne peut pas cocher un jour futur");
        Optional<Validation> existante = validations.stream().filter(v -> v.date().equals(date)).findFirst();
        // Modifier les détails plus tard ne change pas l'heure de la coche d'origine
        LocalTime heure = existante.map(Validation::heure)
                .orElse(noterHeure && date.equals(aujourdhui) ? maintenant.toLocalTime().withSecond(0).withNano(0) : null);
        // Ce qui n'est pas renseigné garde sa valeur : ajouter des détails n'efface pas la quantité, et inversement
        Double q = quantite != null ? quantite : existante.map(Validation::quantite).orElse(null);
        DetailsSeance d = details != null && !details.equals(DetailsSeance.AUCUN) ? details
                : existante.map(Validation::details).orElse(DetailsSeance.AUCUN);
        validations.removeIf(v -> v.date().equals(date));
        validations.add(new Validation(date, d, heure, q));
    }

    public void annuler(LocalDate date) {
        validations.removeIf(v -> v.date().equals(date));
    }

    public void archiver() { this.archive = true; }

    public void restaurer() { this.archive = false; }

    public void partager(String code) {
        if (codePartage == null) codePartage = code;
    }

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

    /**
     * Heure à laquelle l'objectif est d'habitude coché : médiane des dernières coches faites le jour même,
     * arrondie aux 5 minutes. Vide tant qu'il n'y a pas assez de coches.
     */
    public Optional<LocalTime> heureHabituelle() {
        List<LocalTime> heures = validations.stream()
                .filter(v -> v.heure() != null)
                .sorted(Comparator.comparing(Validation::date).reversed())
                .limit(COCHES_PRISES_EN_COMPTE)
                .map(Validation::heure)
                .sorted()
                .toList();
        if (heures.size() < COCHES_POUR_HEURE_HABITUELLE) return Optional.empty();
        LocalTime mediane = heures.get(heures.size() / 2);
        return Optional.of(mediane.withMinute(mediane.getMinute() / 5 * 5));
    }

    /**
     * Heure du rappel : 30 min avant l'heure de coucher visée pour le sommeil ; 30 min avant l'heure habituelle
     * si le rappel automatique est choisi et qu'elle est connue ; l'heure choisie sinon.
     */
    public LocalTime heureRappel() {
        if (categorie() == Categorie.SOMMEIL) return heure().minusMinutes(30);
        if (reglages.rappelAuto()) return heureHabituelle().map(h -> h.minusMinutes(30)).orElse(heure());
        return heure();
    }

    public Long id() { return id; }
    public Long utilisateurId() { return utilisateurId; }
    public Reglages reglages() { return reglages; }
    public String nom() { return reglages.nom(); }
    public Categorie categorie() { return reglages.categorie(); }
    public Frequence frequence() { return reglages.frequence(); }
    public LocalTime heure() { return reglages.heure(); }
    public String couleur() { return reglages.couleur(); }
    public Mesure mesure() { return reglages.mesure(); }
    public Double objectifQuantite() { return reglages.objectifQuantite(); }
    public boolean rappelAuto() { return reglages.rappelAuto(); }
    public boolean archive() { return archive; }
    public LocalDate dateCreation() { return dateCreation; }
    public LocalDate cibleDepuis() { return cibleDepuis; }
    public String codePartage() { return codePartage; }
    public List<Validation> validations() { return List.copyOf(validations); }
}
