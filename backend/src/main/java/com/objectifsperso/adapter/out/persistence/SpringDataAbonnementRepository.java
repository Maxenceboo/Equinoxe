package com.objectifsperso.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface SpringDataAbonnementRepository extends JpaRepository<AbonnementEntity, Long> {
    List<AbonnementEntity> findByUtilisateurIdOrderByIdAsc(Long utilisateurId);

    int countByObjectifId(Long objectifId);

    void deleteByUtilisateurIdAndObjectifId(Long utilisateurId, Long objectifId);
}
