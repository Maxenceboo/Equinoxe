package com.objectifsperso.domain.model;

/** Objectif avec sa semaine en cours et, éventuellement, une proposition de nouvelle cible. */
public record ObjectifAvecProgression(Objectif objectif, ProgressionSemaine progression, Suggestion suggestion) {
}
