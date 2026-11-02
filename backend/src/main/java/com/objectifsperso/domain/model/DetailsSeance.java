package com.objectifsperso.domain.model;

/**
 * Détails facultatifs d'une validation, choisis dans des listes prédéfinies.
 * Le domaine ne fait pas de calcul dessus : il les conserve tels quels.
 */
public record DetailsSeance(
        String typeSeance,
        Integer dureeMinutes,
        String ressenti,
        String ponctualite,
        String reveil) {

    public static final DetailsSeance AUCUN = new DetailsSeance(null, null, null, null, null);
}
