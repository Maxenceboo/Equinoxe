package com.objectifsperso.application.service;

import com.objectifsperso.application.port.in.GererObjectifsUseCase;
import com.objectifsperso.application.port.in.ObjectifCommande;
import com.objectifsperso.application.port.out.Horloge;
import com.objectifsperso.application.port.out.ObjectifRepository;
import com.objectifsperso.domain.exception.ObjectifIntrouvableException;
import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Historique;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.ObjectifAvecProgression;
import com.objectifsperso.domain.service.CalculProgression;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.function.Consumer;

public class ObjectifService implements GererObjectifsUseCase {

    private final ObjectifRepository repository;
    private final Horloge horloge;
    private final CalculProgression calcul;

    public ObjectifService(ObjectifRepository repository, Horloge horloge, CalculProgression calcul) {
        this.repository = repository;
        this.horloge = horloge;
        this.calcul = calcul;
    }

    @Override
    public List<ObjectifAvecProgression> lister(Long utilisateurId, boolean archives) {
        return repository.lister(utilisateurId, archives).stream().map(this::avecProgression).toList();
    }

    @Override
    public ObjectifAvecProgression lire(Long utilisateurId, Long objectifId) {
        return avecProgression(charger(utilisateurId, objectifId));
    }

    @Override
    public ObjectifAvecProgression creer(Long utilisateurId, ObjectifCommande c) {
        Objectif objectif = Objectif.nouveau(utilisateurId, c.nom(), c.categorie(), c.frequence(), c.heure(),
                c.couleur(), horloge.aujourdhui());
        return avecProgression(repository.enregistrer(objectif));
    }

    @Override
    public ObjectifAvecProgression modifier(Long utilisateurId, Long objectifId, ObjectifCommande c) {
        return modifierEtEnregistrer(utilisateurId, objectifId,
                o -> o.modifier(c.nom(), c.categorie(), c.frequence(), c.heure(), c.couleur()));
    }

    @Override
    public ObjectifAvecProgression archiver(Long utilisateurId, Long objectifId) {
        return modifierEtEnregistrer(utilisateurId, objectifId, Objectif::archiver);
    }

    @Override
    public ObjectifAvecProgression restaurer(Long utilisateurId, Long objectifId) {
        return modifierEtEnregistrer(utilisateurId, objectifId, Objectif::restaurer);
    }

    @Override
    public ObjectifAvecProgression valider(Long utilisateurId, Long objectifId, LocalDate date, DetailsSeance details) {
        LocalDate aujourdhui = horloge.aujourdhui();
        LocalDate jour = date == null ? aujourdhui : date;
        return modifierEtEnregistrer(utilisateurId, objectifId, o -> o.valider(jour, details, aujourdhui));
    }

    @Override
    public ObjectifAvecProgression annuler(Long utilisateurId, Long objectifId, LocalDate date) {
        return modifierEtEnregistrer(utilisateurId, objectifId, o -> o.annuler(date));
    }

    @Override
    public Historique historique(Long utilisateurId, Long objectifId, YearMonth mois) {
        LocalDate aujourdhui = horloge.aujourdhui();
        return calcul.historique(charger(utilisateurId, objectifId),
                mois == null ? YearMonth.from(aujourdhui) : mois, aujourdhui);
    }

    private ObjectifAvecProgression modifierEtEnregistrer(Long utilisateurId, Long objectifId, Consumer<Objectif> action) {
        Objectif objectif = charger(utilisateurId, objectifId);
        action.accept(objectif);
        return avecProgression(repository.enregistrer(objectif));
    }

    private Objectif charger(Long utilisateurId, Long objectifId) {
        return repository.trouver(utilisateurId, objectifId)
                .orElseThrow(() -> new ObjectifIntrouvableException(objectifId));
    }

    private ObjectifAvecProgression avecProgression(Objectif objectif) {
        return new ObjectifAvecProgression(objectif, calcul.progression(objectif, horloge.aujourdhui()));
    }
}
