package com.objectifsperso.domain.model;

/** Objectif d'un ami suivi en binôme : on ne voit que sa progression, pas ses détails. */
public record ObjectifSuivi(Long objectifId, String nom, String ami, Categorie categorie,
                            ProgressionSemaine progression) {
}
