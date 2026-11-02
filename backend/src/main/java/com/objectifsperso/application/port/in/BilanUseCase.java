package com.objectifsperso.application.port.in;

import com.objectifsperso.domain.model.Bilan;

import java.time.LocalDate;

public interface BilanUseCase {

    /**
     * Bilan de la semaine qui contient {@code jour}. Sans jour : la semaine en cours le dimanche,
     * la semaine dernière les autres jours.
     */
    Bilan bilan(Long utilisateurId, LocalDate jour);
}
