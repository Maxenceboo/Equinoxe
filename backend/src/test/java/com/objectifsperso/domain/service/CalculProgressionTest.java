package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Categorie;
import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Frequence;
import com.objectifsperso.domain.model.Historique;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.ProgressionSemaine;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CalculProgressionTest {

    private static final LocalDate LUNDI = LocalDate.of(2026, 11, 2);
    private final CalculProgression calcul = new CalculProgression();

    private Objectif sport(LocalDate creation) {
        return new Objectif(1L, 1L, "Sport", Categorie.SPORT, Frequence.parSemaine(3), LocalTime.of(18, 0),
                "#3b82f6", false, creation, List.of());
    }

    @Test
    void progression_de_la_semaine() {
        Objectif o = sport(LUNDI);
        LocalDate mercredi = LUNDI.plusDays(2);
        o.valider(LUNDI, DetailsSeance.AUCUN, mercredi);
        o.valider(mercredi, DetailsSeance.AUCUN, mercredi);
        ProgressionSemaine p = calcul.progression(o, mercredi);
        assertThat(p.realisees()).isEqualTo(2);
        assertThat(p.cible()).isEqualTo(3);
        assertThat(p.atteint()).isFalse();
        assertThat(p.joursRestants()).isEqualTo(5);
        assertThat(p.faitAujourdhui()).isTrue();
        assertThat(p.message()).isEqualTo("Encore 1 cette semaine, il reste 5 jours.");
    }

    @Test
    void message_neutre_quand_la_semaine_est_perdue() {
        Objectif o = sport(LUNDI);
        LocalDate dimanche = LUNDI.plusDays(6);
        ProgressionSemaine p = calcul.progression(o, dimanche);
        assertThat(p.message()).isEqualTo("0/3 cette semaine, on repart lundi.");
    }

    @Test
    void serie_et_taux_de_reussite() {
        LocalDate creation = LUNDI.minusWeeks(3);
        Objectif o = sport(creation);
        LocalDate aujourdhui = LUNDI.plusDays(1);
        // semaine -3 réussie, -2 ratée, -1 réussie, semaine en cours en cours
        for (int s : new int[]{3, 1}) {
            LocalDate l = LUNDI.minusWeeks(s);
            o.valider(l, DetailsSeance.AUCUN, aujourdhui);
            o.valider(l.plusDays(2), DetailsSeance.AUCUN, aujourdhui);
            o.valider(l.plusDays(4), DetailsSeance.AUCUN, aujourdhui);
        }
        o.valider(LUNDI.minusWeeks(2), DetailsSeance.AUCUN, aujourdhui);

        Historique h = calcul.historique(o, YearMonth.of(2026, 10), aujourdhui);
        assertThat(h.semainesTotales()).isEqualTo(3);
        assertThat(h.semainesReussies()).isEqualTo(2);
        assertThat(h.serieSemaines()).isEqualTo(1);
        assertThat(h.meilleureSerie()).isEqualTo(1);
        assertThat(h.tauxReussite()).isEqualTo(2.0 / 3);
        assertThat(h.validations()).allMatch(v -> v.date().getMonthValue() == 10);
    }
}
