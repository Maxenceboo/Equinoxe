package com.objectifsperso.application.port.in;

import com.objectifsperso.domain.model.ObjectifSuivi;
import com.objectifsperso.domain.model.Partage;

import java.util.List;

public interface BinomesUseCase {

    /** Donne le code de partage d'un de ses objectifs (le crée au premier appel). */
    Partage partager(Long utilisateurId, Long objectifId);

    /** Suit l'objectif d'un ami grâce à son code. */
    ObjectifSuivi rejoindre(Long utilisateurId, String code);

    List<ObjectifSuivi> suivis(Long utilisateurId);

    void quitter(Long utilisateurId, Long objectifId);
}
