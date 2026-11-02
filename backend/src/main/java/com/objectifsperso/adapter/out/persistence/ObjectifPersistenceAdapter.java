package com.objectifsperso.adapter.out.persistence;

import com.objectifsperso.application.port.out.ObjectifRepository;
import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Frequence;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.Validation;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
class ObjectifPersistenceAdapter implements ObjectifRepository {

    private final SpringDataObjectifRepository jpa;

    ObjectifPersistenceAdapter(SpringDataObjectifRepository jpa) { this.jpa = jpa; }

    @Override
    @Transactional(readOnly = true)
    public Optional<Objectif> trouver(Long utilisateurId, Long objectifId) {
        return jpa.findByIdAndUtilisateurId(objectifId, utilisateurId).map(ObjectifPersistenceAdapter::versDomaine);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Objectif> lister(Long utilisateurId, boolean archives) {
        return jpa.findByUtilisateurIdAndArchiveOrderByIdAsc(utilisateurId, archives).stream()
                .map(ObjectifPersistenceAdapter::versDomaine).toList();
    }

    @Override
    @Transactional
    public Objectif enregistrer(Objectif objectif) {
        return versDomaine(jpa.save(versEntite(objectif)));
    }

    static Objectif versDomaine(ObjectifEntity e) {
        List<Validation> validations = e.validations.stream()
                .map(v -> new Validation(v.date,
                        new DetailsSeance(v.typeSeance, v.dureeMinutes, v.ressenti, v.ponctualite, v.reveil)))
                .toList();
        return new Objectif(e.id, e.utilisateurId, e.nom, e.categorie, new Frequence(e.typeFrequence, e.cible),
                e.heure, e.couleur, e.archive, e.dateCreation, validations);
    }

    static ObjectifEntity versEntite(Objectif o) {
        ObjectifEntity e = new ObjectifEntity();
        e.id = o.id();
        e.utilisateurId = o.utilisateurId();
        e.nom = o.nom();
        e.categorie = o.categorie();
        e.typeFrequence = o.frequence().type();
        e.cible = o.frequence().cible();
        e.heure = o.heure();
        e.couleur = o.couleur();
        e.archive = o.archive();
        e.dateCreation = o.dateCreation();
        for (Validation v : o.validations()) {
            ValidationEmbeddable ve = new ValidationEmbeddable();
            ve.date = v.date();
            ve.typeSeance = v.details().typeSeance();
            ve.dureeMinutes = v.details().dureeMinutes();
            ve.ressenti = v.details().ressenti();
            ve.ponctualite = v.details().ponctualite();
            ve.reveil = v.details().reveil();
            e.validations.add(ve);
        }
        return e;
    }
}
