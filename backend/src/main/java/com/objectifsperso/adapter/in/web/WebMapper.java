package com.objectifsperso.adapter.in.web;

import com.objectifsperso.adapter.in.web.vo.BilanVO;
import com.objectifsperso.adapter.in.web.vo.CategorieVO;
import com.objectifsperso.adapter.in.web.vo.LigneBilanVO;
import com.objectifsperso.adapter.in.web.vo.MesureVO;
import com.objectifsperso.adapter.in.web.vo.ObjectifSuiviVO;
import com.objectifsperso.adapter.in.web.vo.PartageVO;
import com.objectifsperso.adapter.in.web.vo.RepartitionTypeVO;
import com.objectifsperso.adapter.in.web.vo.StatMoisVO;
import com.objectifsperso.adapter.in.web.vo.StatistiquesVO;
import com.objectifsperso.adapter.in.web.vo.SuggestionVO;
import com.objectifsperso.adapter.in.web.vo.DetailsSommeilVO;
import com.objectifsperso.adapter.in.web.vo.DetailsSportVO;
import com.objectifsperso.adapter.in.web.vo.HistoriqueVO;
import com.objectifsperso.adapter.in.web.vo.ObjectifSaisieVO;
import com.objectifsperso.adapter.in.web.vo.ObjectifVO;
import com.objectifsperso.adapter.in.web.vo.PonctualiteVO;
import com.objectifsperso.adapter.in.web.vo.ProgressionSemaineVO;
import com.objectifsperso.adapter.in.web.vo.RappelVO;
import com.objectifsperso.adapter.in.web.vo.RessentiVO;
import com.objectifsperso.adapter.in.web.vo.ReveilVO;
import com.objectifsperso.adapter.in.web.vo.TypeFrequenceVO;
import com.objectifsperso.adapter.in.web.vo.TypeSeanceVO;
import com.objectifsperso.adapter.in.web.vo.UniteSerieVO;
import com.objectifsperso.adapter.in.web.vo.ValidationSaisieVO;
import com.objectifsperso.adapter.in.web.vo.ValidationVO;
import com.objectifsperso.domain.model.Bilan;
import com.objectifsperso.domain.model.Categorie;
import com.objectifsperso.domain.model.Mesure;
import com.objectifsperso.domain.model.ObjectifSuivi;
import com.objectifsperso.domain.model.Partage;
import com.objectifsperso.domain.model.Reglages;
import com.objectifsperso.domain.model.Statistiques;
import com.objectifsperso.domain.model.Suggestion;
import com.objectifsperso.domain.model.DetailsSeance;
import com.objectifsperso.domain.model.Frequence;
import com.objectifsperso.domain.model.Historique;
import com.objectifsperso.domain.model.Objectif;
import com.objectifsperso.domain.model.ObjectifAvecProgression;
import com.objectifsperso.domain.model.ProgressionSemaine;
import com.objectifsperso.domain.model.Rappel;
import com.objectifsperso.domain.model.TypeFrequence;
import com.objectifsperso.domain.model.Validation;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.function.Function;

/** Conversion entre les VO générés depuis OpenAPI et le domaine. */
final class WebMapper {

    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_HEURE = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private WebMapper() { }

    static Reglages reglages(ObjectifSaisieVO vo) {
        TypeFrequence type = TypeFrequence.valueOf(vo.getTypeFrequence().getValue());
        return new Reglages(
                vo.getNom(),
                Categorie.valueOf(vo.getCategorie().getValue()),
                new Frequence(type, vo.getCible()),
                LocalTime.parse(vo.getHeure(), HEURE),
                vo.getCouleur(),
                mesure(vo.getMesure()),
                vo.getObjectifQuantite(),
                Boolean.TRUE.equals(vo.getRappelAuto()));
    }

    static Mesure mesure(MesureVO vo) {
        return vo == null || vo == MesureVO.AUCUNE ? null : Mesure.valueOf(vo.getValue());
    }

    static MesureVO vo(Mesure m) {
        return m == null ? MesureVO.AUCUNE : MesureVO.fromValue(m.name());
    }

    static DetailsSeance details(ValidationSaisieVO vo) {
        DetailsSportVO sport = vo.getSport();
        DetailsSommeilVO sommeil = vo.getSommeil();
        return new DetailsSeance(
                sport == null ? null : nom(sport.getTypeSeance(), TypeSeanceVO::getValue),
                sport == null || sport.getDureeMinutes() == null ? null : sport.getDureeMinutes().getValue(),
                sport == null ? null : nom(sport.getRessenti(), RessentiVO::getValue),
                sommeil == null ? null : nom(sommeil.getPonctualite(), PonctualiteVO::getValue),
                sommeil == null ? null : nom(sommeil.getReveil(), ReveilVO::getValue));
    }

    static ObjectifVO vo(ObjectifAvecProgression oap) {
        Objectif o = oap.objectif();
        return new ObjectifVO(o.id(), o.nom(), CategorieVO.fromValue(o.categorie().name()),
                TypeFrequenceVO.fromValue(o.frequence().type().name()), o.frequence().cible(),
                o.heure().format(HEURE), o.couleur(), o.archive(), o.dateCreation(), vo(oap.progression()),
                vo(o.mesure()), o.rappelAuto(), o.heureRappel().format(HEURE))
                .objectifQuantite(o.objectifQuantite())
                .heureHabituelle(o.heureHabituelle().map(h -> h.format(HEURE)).orElse(null))
                .partage(o.codePartage() != null)
                .suggestion(vo(oap.suggestion()));
    }

    static SuggestionVO vo(Suggestion s) {
        return s == null ? null : new SuggestionVO(s.nouvelleCible(), s.raison());
    }

    static BilanVO vo(Bilan b) {
        return new BilanVO(b.debutSemaine(), b.lignes().stream().map(WebMapper::vo).toList(), b.tenus(), b.total(),
                b.seances(), b.seancesSemainePrecedente(), b.phrase());
    }

    static LigneBilanVO vo(Bilan.Ligne l) {
        return new LigneBilanVO(l.objectifId(), l.nom(), CategorieVO.fromValue(l.categorie().name()), l.realisees(),
                l.cible(), l.atteint(), l.serie().enCours(), UniteSerieVO.fromValue(l.serie().unite().name()),
                vo(l.mesure())).quantite(l.quantite()).suggestion(vo(l.suggestion()));
    }

    static StatistiquesVO vo(Statistiques s) {
        return new StatistiquesVO(s.totalSeances(), s.totalMinutes(), vo(s.mesure()), s.moyenneParSemaine(),
                s.mois().stream().map(m -> new StatMoisVO(m.mois().toString(), m.seances(), m.minutes())
                        .quantite(m.quantite())).toList(),
                s.types().stream().map(t -> new RepartitionTypeVO(TypeSeanceVO.fromValue(t.type()), t.nombre()))
                        .toList())
                .totalQuantite(s.totalQuantite());
    }

    static PartageVO vo(Partage p) {
        return new PartageVO(p.code(), p.abonnes());
    }

    static ObjectifSuiviVO vo(ObjectifSuivi s) {
        return new ObjectifSuiviVO(s.objectifId(), s.nom(), s.ami(), CategorieVO.fromValue(s.categorie().name()),
                vo(s.progression()));
    }

    static ProgressionSemaineVO vo(ProgressionSemaine p) {
        return new ProgressionSemaineVO(p.debutSemaine(), p.realisees(), p.cible(), p.atteint(), p.joursRestants(),
                p.faitAujourdhui(), p.serie().enCours(), p.serie().record(),
                UniteSerieVO.fromValue(p.serie().unite().name()), p.serie().jokersRestants()).message(p.message())
                .quantiteSemaine(p.quantiteSemaine());
    }

    static HistoriqueVO vo(Historique h) {
        return new HistoriqueVO(h.mois().toString(), h.validations().stream().map(WebMapper::vo).toList(),
                h.serieSemaines(), h.meilleureSerie(), h.semainesReussies(), h.semainesTotales(), h.tauxReussite());
    }

    static ValidationVO vo(Validation v) {
        DetailsSeance d = v.details();
        ValidationVO vo = new ValidationVO(v.date()).quantite(v.quantite())
                .heure(v.heure() == null ? null : v.heure().format(HEURE));
        if (d.typeSeance() != null || d.dureeMinutes() != null || d.ressenti() != null) {
            vo.sport(new DetailsSportVO()
                    .typeSeance(d.typeSeance() == null ? null : TypeSeanceVO.fromValue(d.typeSeance()))
                    .dureeMinutes(d.dureeMinutes() == null ? null : DetailsSportVO.DureeMinutesEnum.fromValue(d.dureeMinutes()))
                    .ressenti(d.ressenti() == null ? null : RessentiVO.fromValue(d.ressenti())));
        }
        if (d.ponctualite() != null || d.reveil() != null) {
            vo.sommeil(new DetailsSommeilVO()
                    .ponctualite(d.ponctualite() == null ? null : PonctualiteVO.fromValue(d.ponctualite()))
                    .reveil(d.reveil() == null ? null : ReveilVO.fromValue(d.reveil())));
        }
        return vo;
    }

    static RappelVO vo(Rappel r) {
        return new RappelVO(r.objectifId(), r.nomObjectif(), r.dateHeure().format(DATE_HEURE), r.message());
    }

    private static <E> String nom(E valeur, Function<E, String> extraire) {
        return valeur == null ? null : extraire.apply(valeur);
    }
}
