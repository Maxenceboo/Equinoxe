package com.objectifsperso.domain.model;

/** Série en cours (la « flamme ») et record, en jours (objectif quotidien) ou en semaines. */
public record Serie(int enCours, int record, Unite unite) {

    public enum Unite { JOURS, SEMAINES }
}
