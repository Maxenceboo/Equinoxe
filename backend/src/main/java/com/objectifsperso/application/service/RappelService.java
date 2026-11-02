package com.objectifsperso.application.service;

import com.objectifsperso.application.port.in.RappelsUseCase;
import com.objectifsperso.application.port.out.Horloge;
import com.objectifsperso.application.port.out.ObjectifRepository;
import com.objectifsperso.domain.model.Rappel;
import com.objectifsperso.domain.service.PlanificateurRappels;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

public class RappelService implements RappelsUseCase {

    private final ObjectifRepository repository;
    private final Horloge horloge;
    private final PlanificateurRappels planificateur;

    public RappelService(ObjectifRepository repository, Horloge horloge, PlanificateurRappels planificateur) {
        this.repository = repository;
        this.horloge = horloge;
        this.planificateur = planificateur;
    }

    @Override
    public List<Rappel> prochainsRappels(Long utilisateurId, int jours) {
        LocalDateTime maintenant = horloge.maintenant();
        return repository.lister(utilisateurId, false).stream()
                .flatMap(o -> planificateur.rappels(o, maintenant, jours).stream())
                .sorted(Comparator.comparing(Rappel::dateHeure))
                .toList();
    }
}
