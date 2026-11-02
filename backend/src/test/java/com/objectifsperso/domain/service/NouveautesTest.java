package com.objectifsperso.domain.service;

import com.objectifsperso.domain.model.Bilan;
import com.objectifsperso.domain.model.Categorie;
import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Frequence;
import com.objectifsperso.domain.model.Mesure;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.Reglages;
import com.objectifsperso.domain.model.Semaine;
import com.objectifsperso.domain.model.Statistiques;
import com.objectifsperso.domain.model.Suggestion;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** Cible qui s'adapte, heure habituelle, objectifs chiffrés, bilan et statistiques. */
class NouveautesTest {

    private static final LocalDate LUNDI = LocalDate.of(2026, 11, 2);
    private final ConseilCible conseil = new ConseilCible();

    private Objectif sport(int cible, LocalDate creation) {
        return new Objectif(1L, 1L, "Sport", Categorie.SPORT, Frequence.parSemaine(cible), LocalTime.of(18, 0),
                "#ffffff", false, creation, List.of());
    }

    private static void semaine(Objectif o, LocalDate lundi, int fois) {
        for (int i = 0; i < fois; i++) o.valider(lundi.plusDays(i * 2L), DetailsSeance.AUCUN, LUNDI);
    }

    @Test
    void propose_plus_un_apres_quatre_semaines_reussies() {
        Objectif o = sport(3, LUNDI.minusWeeks(4));
        for (int i = 1; i <= 3; i++) semaine(o, LUNDI.minusWeeks(i), 3);
        assertThat(conseil.suggestion(o, LUNDI)).isEmpty();
        semaine(o, LUNDI.minusWeeks(4), 3);
        assertThat(conseil.suggestion(o, LUNDI)).map(Suggestion::nouvelleCible).contains(4);
    }

    @Test
    void propose_moins_un_apres_trois_semaines_ratees_et_oublie_l_ancienne_cible() {
        Objectif o = sport(4, LUNDI.minusWeeks(3));
        for (int i = 1; i <= 3; i++) semaine(o, LUNDI.minusWeeks(i), 2);
        assertThat(conseil.suggestion(o, LUNDI)).map(Suggestion::nouvelleCible).contains(3);

        // Une fois la cible changée, les semaines d'avant ne comptent plus
        o.modifier(o.reglages().avecCible(3), LUNDI);
        assertThat(conseil.suggestion(o, LUNDI)).isEmpty();
        assertThat(conseil.suggestion(o, LUNDI.plusWeeks(2))).isEmpty();
    }

    @Test
    void rappel_a_l_heure_habituelle_apres_cinq_coches() {
        Reglages r = new Reglages("Sport", Categorie.SPORT, Frequence.parSemaine(3), LocalTime.of(18, 0), null,
                null, null, true);
        Objectif o = new Objectif(1L, 1L, r, false, LUNDI.minusDays(10), null, null, List.of());
        int[] minutes = {7 * 60 + 2, 7 * 60 + 14, 6 * 60 + 58, 7 * 60 + 9};
        for (int i = 0; i < minutes.length; i++) {
            LocalDate d = LUNDI.minusDays(i + 1L);
            o.valider(d, DetailsSeance.AUCUN, null, d.atTime(minutes[i] / 60, minutes[i] % 60));
        }
        assertThat(o.heureHabituelle()).isEmpty();
        assertThat(o.heureRappel()).isEqualTo(LocalTime.of(18, 0));

        o.valider(LUNDI, DetailsSeance.AUCUN, null, LUNDI.atTime(7, 30));
        assertThat(o.heureHabituelle()).contains(LocalTime.of(7, 5));
        assertThat(o.heureRappel()).isEqualTo(LocalTime.of(6, 35));

        // Une coche faite après coup (un autre jour) n'apprend pas d'heure
        o.valider(LUNDI.minusDays(8), DetailsSeance.AUCUN, null, LUNDI.atTime(22, 0));
        assertThat(o.validations().stream().filter(v -> v.date().equals(LUNDI.minusDays(8))).findFirst()
                .map(v -> Optional.ofNullable(v.heure()))).contains(Optional.empty());
    }

    @Test
    void bilan_et_statistiques_d_un_objectif_chiffre() {
        Reglages r = new Reglages("Courir", Categorie.SPORT, Frequence.parSemaine(2), LocalTime.of(18, 0), null,
                Mesure.KM, 15.0, false);
        Objectif o = new Objectif(1L, 1L, r, false, LUNDI.minusWeeks(1), null, null, List.of());
        LocalDate dimanche = LUNDI.plusDays(6);
        o.valider(LUNDI, new DetailsSeance("COURSE", 30, null, null, null), 5.0, LUNDI.atTime(19, 0));
        o.valider(LUNDI.plusDays(3), new DetailsSeance("COURSE", 45, null, null, null), 8.0, dimanche.atTime(9, 0));
        o.valider(LUNDI.minusDays(3), new DetailsSeance("VELO", 60, null, null, null), 20.0, LUNDI.atTime(9, 0));

        Bilan b = new CalculBilan(new CalculProgression(), conseil).bilan(List.of(o), Semaine.de(dimanche), dimanche);
        assertThat(b.tenus()).isEqualTo(1);
        assertThat(b.seances()).isEqualTo(2);
        assertThat(b.seancesSemainePrecedente()).isEqualTo(1);
        assertThat(b.lignes().get(0).quantite()).isEqualTo(13.0);
        assertThat(b.phrase()).contains("bravo").contains("Plus actif");

        Statistiques s = new CalculStatistiques().statistiques(o, dimanche);
        assertThat(s.totalSeances()).isEqualTo(3);
        assertThat(s.totalMinutes()).isEqualTo(135);
        assertThat(s.totalQuantite()).isEqualTo(33.0);
        assertThat(s.types().get(0).type()).isEqualTo("COURSE");
        assertThat(s.mois()).hasSize(6);
        assertThat(s.mois().get(5).quantite()).isEqualTo(13.0);
        assertThat(s.mois().get(4).quantite()).isEqualTo(20.0);
    }
}
