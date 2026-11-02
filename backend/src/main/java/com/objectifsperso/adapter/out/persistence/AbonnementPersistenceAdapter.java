package com.objectifsperso.adapter.out.persistence;

import com.objectifsperso.application.port.out.AbonnementRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
class AbonnementPersistenceAdapter implements AbonnementRepository {

    private final SpringDataAbonnementRepository jpa;

    AbonnementPersistenceAdapter(SpringDataAbonnementRepository jpa) { this.jpa = jpa; }

    @Override
    @Transactional
    public void ajouter(Long utilisateurId, Long objectifId) {
        AbonnementEntity e = new AbonnementEntity();
        e.utilisateurId = utilisateurId;
        e.objectifId = objectifId;
        jpa.save(e);
    }

    @Override
    @Transactional
    public void retirer(Long utilisateurId, Long objectifId) {
        jpa.deleteByUtilisateurIdAndObjectifId(utilisateurId, objectifId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> objectifsSuivis(Long utilisateurId) {
        return jpa.findByUtilisateurIdOrderByIdAsc(utilisateurId).stream().map(e -> e.objectifId).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public int nombreAbonnes(Long objectifId) {
        return jpa.countByObjectifId(objectifId);
    }
}
