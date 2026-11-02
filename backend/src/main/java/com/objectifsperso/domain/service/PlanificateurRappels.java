package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Categorie;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.Rappel;
import com.objectifsperso.domain.model.Semaine;
import com.objectifsperso.domain.model.TypeFrequence;
import com.objectifsperso.domain.model.Validation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Répartit les rappels sur la semaine sans jours fixes.
 *
 * <p>Pour N séances par semaine, l'écart idéal est de 7 / N jours. Après chaque séance cochée,
 * les rappels restants sont recalculés : jours disponibles / séances restantes. Aucun rappel
 * un jour déjà coché, ni quand l'objectif de la semaine est atteint.
 */
public class PlanificateurRappels {

    public List<Rappel> rappels(Objectif objectif, LocalDateTime maintenant, int jours) {
        if (objectif.archive()) return List.of();
        LocalDate aujourdhui = maintenant.toLocalDate();
        LocalDate dernierJour = aujourdhui.plusDays(jours - 1L);

        List<Rappel> rappels = new ArrayList<>();
        for (Semaine s = Semaine.de(aujourdhui); !s.lundi().isAfter(dernierJour); s = s.suivante()) {
            for (Rappel r : rappelsDeLaSemaine(objectif, s, aujourdhui)) {
                LocalDate jour = r.dateHeure().toLocalDate();
                if (!jour.isAfter(dernierJour) && r.dateHeure().isAfter(maintenant)) rappels.add(r);
            }
        }
        rappels.sort(Comparator.comparing(Rappel::dateHeure));
        return rappels;
    }

    List<Rappel> rappelsDeLaSemaine(Objectif objectif, Semaine semaine, LocalDate aujourdhui) {
        List<LocalDate> jours = objectif.frequence().type() == TypeFrequence.QUOTIDIEN
                ? joursQuotidiens(objectif, semaine, aujourdhui)
                : joursEspaces(objectif, semaine, aujourdhui);
        List<Rappel> rappels = new ArrayList<>();
        int restantes = objectif.frequence().parSemaine() - objectif.validationsDe(semaine).size();
        for (LocalDate jour : jours) {
            rappels.add(new Rappel(objectif.id(), objectif.nom(), jour.atTime(objectif.heureRappel()),
                    message(objectif, restantes)));
            restantes--;
        }
        return rappels;
    }

    private List<LocalDate> joursQuotidiens(Objectif objectif, Semaine semaine, LocalDate aujourdhui) {
        List<LocalDate> jours = new ArrayList<>();
        for (LocalDate d = max(semaine.lundi(), aujourdhui); !d.isAfter(semaine.dimanche()); d = d.plusDays(1)) {
            if (!objectif.estFaitLe(d)) jours.add(d);
        }
        return jours;
    }

    private List<LocalDate> joursEspaces(Objectif objectif, Semaine semaine, LocalDate aujourdhui) {
        int cible = objectif.frequence().parSemaine();
        List<Validation> faites = objectif.validationsDe(semaine);
        int restantes = cible - faites.size();
        if (restantes <= 0) return List.of();

        LocalDate premierPossible = max(semaine.lundi(), aujourdhui);
        if (objectif.estFaitLe(premierPossible)) premierPossible = premierPossible.plusDays(1);
        if (premierPossible.isAfter(semaine.dimanche())) return List.of();

        int ecartIdeal = Math.max(1, 7 / cible);
        LocalDate debut = premierPossible;
        if (!faites.isEmpty()) {
            LocalDate derniere = faites.get(faites.size() - 1).date();
            debut = max(debut, derniere.plusDays(ecartIdeal));
        }
        // Pas assez de jours pour respecter l'écart : on avance le début autant que nécessaire.
        if (joursEntre(debut, semaine.dimanche()) < restantes) {
            debut = max(premierPossible, semaine.dimanche().minusDays(restantes - 1L));
        }
        int disponibles = joursEntre(debut, semaine.dimanche());
        if (disponibles <= 0) return List.of();

        int ecart = Math.max(1, disponibles / restantes);
        List<LocalDate> jours = new ArrayList<>();
        for (LocalDate d = debut; jours.size() < restantes && !d.isAfter(semaine.dimanche()); d = d.plusDays(ecart)) {
            if (!objectif.estFaitLe(d)) jours.add(d);
        }
        return jours;
    }

    private String message(Objectif objectif, int restantes) {
        if (objectif.categorie() == Categorie.SOMMEIL) {
            return "Coucher visé à " + objectif.heure() + " : c'est bientôt l'heure.";
        }
        if (objectif.frequence().type() == TypeFrequence.QUOTIDIEN) {
            return "Pense à ton objectif du jour : " + objectif.nom() + ".";
        }
        return "C'est un bon jour pour : " + objectif.nom() + " (encore " + restantes + " cette semaine).";
    }

    private static int joursEntre(LocalDate debut, LocalDate fin) {
        return (int) ChronoUnit.DAYS.between(debut, fin) + 1;
    }

    private static LocalDate max(LocalDate a, LocalDate b) { return a.isAfter(b) ? a : b; }
}
