package com.objectifsperso.application.port.out;

import com.objectifsperso.domain.model.Objectif;

import java.util.List;
import java.util.Optional;

public interface ObjectifRepository {
    Optional<Objectif> trouver(Long utilisateurId, Long objectifId);

    /** Sans filtre sur le propriétaire : pour les objectifs suivis en binôme. */
    Optional<Objectif> trouverParId(Long objectifId);

    Optional<Objectif> trouverParCode(String codePartage);

    List<Objectif> lister(Long utilisateurId, boolean archives);

    Objectif enregistrer(Objectif objectif);
}
