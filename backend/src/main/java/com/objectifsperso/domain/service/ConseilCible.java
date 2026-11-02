package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.Semaine;
import com.objectifsperso.domain.model.Suggestion;
import com.objectifsperso.domain.model.TypeFrequence;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Propose d'ajuster la cible d'un objectif « X fois par semaine » :
 * +1 après 4 semaines réussies d'affilée, -1 après 3 semaines ratées d'affilée.
 * Seules les semaines terminées comptent, et seulement celles d'après le dernier changement de cible.
 */
public class ConseilCible {

    public static final int SEMAINES_POUR_MONTER = 4;
    public static final int SEMAINES_POUR_BAISSER = 3;

    public Optional<Suggestion> suggestion(Objectif objectif, LocalDate aujourdhui) {
        if (objectif.archive() || objectif.frequence().type() != TypeFrequence.PAR_SEMAINE) return Optional.empty();
        int cible = objectif.frequence().cible();

        LocalDate limite = objectif.cibleDepuis() == null ? LocalDate.MIN : objectif.cibleDepuis();
        Boolean reussite = null;
        int affilee = 0;
        for (Semaine s = Semaine.de(aujourdhui).precedente();
             !s.lundi().isBefore(limite) && affilee < SEMAINES_POUR_MONTER;
             s = s.precedente()) {
            boolean ok = objectif.validationsDe(s).size() >= cible;
            if (reussite == null) reussite = ok;
            else if (ok != reussite) break;
            affilee++;
        }
        if (Boolean.TRUE.equals(reussite) && affilee >= SEMAINES_POUR_MONTER && cible < 7) {
            return Optional.of(new Suggestion(cible + 1,
                    affilee + " semaines réussies d'affilée. Prêt pour " + (cible + 1) + " par semaine ?"));
        }
        if (Boolean.FALSE.equals(reussite) && affilee >= SEMAINES_POUR_BAISSER && cible > 1) {
            return Optional.of(new Suggestion(cible - 1,
                    affilee + " semaines sous l'objectif. " + (cible - 1)
                            + " par semaine serait peut-être plus tenable, pour garder le rythme."));
        }
        return Optional.empty();
    }
}
