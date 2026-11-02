package com.objectifsperso.domain.model;

/** Proposition de changer la cible d'un objectif, au vu des dernières semaines. */
public record Suggestion(int nouvelleCible, String raison) {
}
