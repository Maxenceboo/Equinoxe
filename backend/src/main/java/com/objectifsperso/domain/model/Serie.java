package com.objectifsperso.domain.model;

/**
 * Série en cours (la « flamme ») et record, en jours (objectif quotidien) ou en semaines,
 * avec le nombre de jokers encore disponibles ce mois-ci.
 */
public record Serie(int enCours, int record, Unite unite, int jokersRestants) {

    public enum Unite { JOURS, SEMAINES }
}
