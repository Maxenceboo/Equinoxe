package com.objectifsperso.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface SpringDataObjectifRepository extends JpaRepository<ObjectifEntity, Long> {
    Optional<ObjectifEntity> findByIdAndUtilisateurId(Long id, Long utilisateurId);

    Optional<ObjectifEntity> findByCodePartage(String codePartage);

    List<ObjectifEntity> findByUtilisateurIdAndArchiveOrderByIdAsc(Long utilisateurId, boolean archive);
}
