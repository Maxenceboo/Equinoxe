package com.objectifsperso.application.port.out;

import com.objectifsperso.domain.model.Objectif;

import java.util.List;
import java.util.Optional;

public interface ObjectifRepository {
    Optional<Objectif> trouver(Long utilisateurId, Long objectifId);

    List<Objectif> lister(Long utilisateurId, boolean archives);

    Objectif enregistrer(Objectif objectif);
}
