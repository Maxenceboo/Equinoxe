package com.objectifsperso.application.port.in;

import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Historique;
import com.objectifsperso.domain.model.ObjectifAvecProgression;
import com.objectifsperso.domain.model.Reglages;
import com.objectifsperso.domain.model.Statistiques;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public interface GererObjectifsUseCase {

    List<ObjectifAvecProgression> lister(Long utilisateurId, boolean archives);

    ObjectifAvecProgression lire(Long utilisateurId, Long objectifId);

    ObjectifAvecProgression creer(Long utilisateurId, Reglages reglages);

    ObjectifAvecProgression modifier(Long utilisateurId, Long objectifId, Reglages reglages);

    ObjectifAvecProgression archiver(Long utilisateurId, Long objectifId);

    ObjectifAvecProgression restaurer(Long utilisateurId, Long objectifId);

    /** date nulle = aujourd'hui ; quantité nulle pour un objectif non chiffré. */
    ObjectifAvecProgression valider(Long utilisateurId, Long objectifId, LocalDate date, DetailsSeance details,
                                    Double quantite);

    ObjectifAvecProgression annuler(Long utilisateurId, Long objectifId, LocalDate date);

    /** mois nul = mois en cours. */
    Historique historique(Long utilisateurId, Long objectifId, YearMonth mois);

    Statistiques statistiques(Long utilisateurId, Long objectifId);
}
