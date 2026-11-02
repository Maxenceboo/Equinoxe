package com.objectifsperso.application.service;

import com.objectifsperso.application.port.in.BilanUseCase;
import com.objectifsperso.application.port.out.Horloge;
import com.objectifsperso.application.port.out.ObjectifRepository;
import com.objectifsperso.domain.model.Bilan;
import com.objectifsperso.domain.model.Semaine;
import com.objectifsperso.domain.service.CalculBilan;

import java.time.DayOfWeek;
import java.time.LocalDate;

public class BilanService implements BilanUseCase {

    private final ObjectifRepository repository;
    private final Horloge horloge;
    private final CalculBilan calcul;

    public BilanService(ObjectifRepository repository, Horloge horloge, CalculBilan calcul) {
        this.repository = repository;
        this.horloge = horloge;
        this.calcul = calcul;
    }

    @Override
    public Bilan bilan(Long utilisateurId, LocalDate jour) {
        LocalDate aujourdhui = horloge.aujourdhui();
        Semaine semaine;
        if (jour != null) semaine = Semaine.de(jour);
        else if (aujourdhui.getDayOfWeek() == DayOfWeek.SUNDAY) semaine = Semaine.de(aujourdhui);
        else semaine = Semaine.de(aujourdhui).precedente();
        if (semaine.lundi().isAfter(aujourdhui)) semaine = Semaine.de(aujourdhui);
        return calcul.bilan(repository.lister(utilisateurId, false), semaine, aujourdhui);
    }
}
