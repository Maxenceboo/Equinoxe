package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Categorie;
import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Frequence;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.Rappel;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlanificateurRappelsTest {

    // Lundi 2 novembre 2026
    private static final LocalDate LUNDI = LocalDate.of(2026, 11, 2);
    private final PlanificateurRappels planificateur = new PlanificateurRappels();

    private Objectif sport(int fois) {
        return new Objectif(1L, 1L, "Sport", Categorie.SPORT, Frequence.parSemaine(fois), LocalTime.of(18, 0),
                "#3b82f6", false, LUNDI.minusWeeks(2), List.of());
    }

    private List<LocalDate> jours(List<Rappel> rappels) {
        return rappels.stream().map(r -> r.dateHeure().toLocalDate()).toList();
    }

    @Test
    void trois_fois_par_semaine_sans_seance_repartit_lundi_mercredi_vendredi() {
        List<Rappel> r = planificateur.rappels(sport(3), LUNDI.atTime(8, 0), 7);
        assertThat(jours(r)).containsExactly(LUNDI, LUNDI.plusDays(2), LUNDI.plusDays(4));
        assertThat(r.get(0).dateHeure().toLocalTime()).isEqualTo(LocalTime.of(18, 0));
    }

    @Test
    void apres_une_seance_le_lundi_les_rappels_sont_recalcules() {
        Objectif o = sport(3);
        o.valider(LUNDI, DetailsSeance.AUCUN, LUNDI);
        List<Rappel> r = planificateur.rappels(o, LUNDI.atTime(19, 0), 7);
        assertThat(jours(r)).containsExactly(LUNDI.plusDays(2), LUNDI.plusDays(4));
    }

    @Test
    void en_retard_le_jeudi_les_rappels_sont_resserres() {
        LocalDate jeudi = LUNDI.plusDays(3);
        List<Rappel> r = planificateur.rappels(sport(3), jeudi.atTime(8, 0), 4);
        assertThat(jours(r)).containsExactly(jeudi, jeudi.plusDays(1), jeudi.plusDays(2));
    }

    @Test
    void aucun_rappel_quand_la_semaine_est_atteinte() {
        Objectif o = sport(2);
        o.valider(LUNDI, DetailsSeance.AUCUN, LUNDI.plusDays(1));
        o.valider(LUNDI.plusDays(1), DetailsSeance.AUCUN, LUNDI.plusDays(1));
        List<Rappel> r = planificateur.rappels(o, LUNDI.plusDays(1).atTime(20, 0), 6);
        assertThat(r).isEmpty();
    }

    @Test
    void la_semaine_suivante_repart_de_zero() {
        Objectif o = sport(2);
        o.valider(LUNDI, DetailsSeance.AUCUN, LUNDI.plusDays(1));
        o.valider(LUNDI.plusDays(1), DetailsSeance.AUCUN, LUNDI.plusDays(1));
        List<Rappel> r = planificateur.rappels(o, LUNDI.plusDays(1).atTime(20, 0), 10);
        assertThat(jours(r)).containsExactly(LUNDI.plusWeeks(1), LUNDI.plusWeeks(1).plusDays(3));
    }

    @Test
    void rappel_deja_passe_aujourdhui_est_ignore() {
        List<Rappel> r = planificateur.rappels(sport(3), LUNDI.atTime(18, 30), 7);
        assertThat(jours(r)).doesNotContain(LUNDI);
    }

    @Test
    void sommeil_rappel_chaque_soir_30_min_avant_le_coucher() {
        Objectif o = new Objectif(2L, 1L, "Me coucher tôt", Categorie.SOMMEIL, Frequence.quotidien(),
                LocalTime.of(23, 0), "#8b5cf6", false, LUNDI, List.of());
        List<Rappel> r = planificateur.rappels(o, LUNDI.atTime(8, 0), 3);
        assertThat(r).hasSize(3);
        assertThat(r).allMatch(x -> x.dateHeure().toLocalTime().equals(LocalTime.of(22, 30)));
    }

    @Test
    void objectif_archive_ne_donne_aucun_rappel() {
        Objectif o = sport(3);
        o.archiver();
        assertThat(planificateur.rappels(o, LUNDI.atTime(8, 0), 7)).isEmpty();
    }

    @Test
    void rappels_dans_la_fenetre() {
        LocalDateTime maintenant = LUNDI.atTime(8, 0);
        assertThat(planificateur.rappels(sport(3), maintenant, 2)).hasSize(1);
    }
}
