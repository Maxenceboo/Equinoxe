package com.objectifsperso.domain.model;

import java.time.LocalDate;
import java.util.List;

/** Bilan d'une semaine, tous objectifs confondus. */
public record Bilan(LocalDate debutSemaine, List<Ligne> lignes, int tenus, int total, int seances,
                    int seancesSemainePrecedente, String phrase) {

    public record Ligne(Long objectifId, String nom, Categorie categorie, int realisees, int cible, boolean atteint,
                        Serie serie, Mesure mesure, Double quantite, Suggestion suggestion) {
    }
}
