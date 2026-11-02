package com.objectifsperso.application.port.in;

import com.objectifsperso.domain.model.Rappel;

import java.util.List;

public interface RappelsUseCase {
    List<Rappel> prochainsRappels(Long utilisateurId, int jours);
}
