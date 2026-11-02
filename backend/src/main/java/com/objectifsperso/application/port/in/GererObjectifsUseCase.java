package com.objectifsperso.application.port.in;

import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Historique;
import com.objectifsperso.domain.model.ObjectifAvecProgression;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public interface GererObjectifsUseCase {

    List<ObjectifAvecProgression> lister(Long utilisateurId, boolean archives);

    ObjectifAvecProgression lire(Long utilisateurId, Long objectifId);

    ObjectifAvecProgression creer(Long utilisateurId, ObjectifCommande commande);

    ObjectifAvecProgression modifier(Long utilisateurId, Long objectifId, ObjectifCommande commande);

    ObjectifAvecProgression archiver(Long utilisateurId, Long objectifId);

    ObjectifAvecProgression restaurer(Long utilisateurId, Long objectifId);

    /** date nulle = aujourd'hui. */
    ObjectifAvecProgression valider(Long utilisateurId, Long objectifId, LocalDate date, DetailsSeance details);

    ObjectifAvecProgression annuler(Long utilisateurId, Long objectifId, LocalDate date);

    /** mois nul = mois en cours. */
    Historique historique(Long utilisateurId, Long objectifId, YearMonth mois);
}
