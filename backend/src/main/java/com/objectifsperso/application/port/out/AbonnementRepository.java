package com.objectifsperso.application.port.out;

import java.util.List;

/** Qui suit quel objectif en binôme. */
public interface AbonnementRepository {
    void ajouter(Long utilisateurId, Long objectifId);

    void retirer(Long utilisateurId, Long objectifId);

    List<Long> objectifsSuivis(Long utilisateurId);

    int nombreAbonnes(Long objectifId);
}
