package com.objectifsperso.adapter.in.web;

import com.objectifsperso.adapter.in.web.api.ObjectifsApi;
import com.objectifsperso.adapter.in.web.vo.HistoriqueVO;
import com.objectifsperso.adapter.in.web.vo.ObjectifSaisieVO;
import com.objectifsperso.adapter.in.web.vo.ObjectifVO;
import com.objectifsperso.adapter.in.web.vo.StatistiquesVO;
import com.objectifsperso.adapter.in.web.vo.ValidationSaisieVO;
import com.objectifsperso.application.port.in.GererObjectifsUseCase;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
class ObjectifsController implements ObjectifsApi {

    private final GererObjectifsUseCase objectifs;
    private final UtilisateurCourant utilisateur;

    ObjectifsController(GererObjectifsUseCase objectifs, UtilisateurCourant utilisateur) {
        this.objectifs = objectifs;
        this.utilisateur = utilisateur;
    }

    @Override
    public ResponseEntity<List<ObjectifVO>> listerObjectifs(Boolean archives) {
        return ResponseEntity.ok(objectifs.lister(utilisateur.id(), Boolean.TRUE.equals(archives)).stream()
                .map(WebMapper::vo).toList());
    }

    @Override
    public ResponseEntity<ObjectifVO> lireObjectif(Long id) {
        return ResponseEntity.ok(WebMapper.vo(objectifs.lire(utilisateur.id(), id)));
    }

    @Override
    public ResponseEntity<ObjectifVO> creerObjectif(ObjectifSaisieVO saisie) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(WebMapper.vo(objectifs.creer(utilisateur.id(), WebMapper.reglages(saisie))));
    }

    @Override
    public ResponseEntity<ObjectifVO> modifierObjectif(Long id, ObjectifSaisieVO saisie) {
        return ResponseEntity.ok(WebMapper.vo(objectifs.modifier(utilisateur.id(), id, WebMapper.reglages(saisie))));
    }

    @Override
    public ResponseEntity<ObjectifVO> archiverObjectif(Long id) {
        return ResponseEntity.ok(WebMapper.vo(objectifs.archiver(utilisateur.id(), id)));
    }

    @Override
    public ResponseEntity<ObjectifVO> restaurerObjectif(Long id) {
        return ResponseEntity.ok(WebMapper.vo(objectifs.restaurer(utilisateur.id(), id)));
    }

    @Override
    public ResponseEntity<ObjectifVO> validerObjectif(Long id, ValidationSaisieVO saisie) {
        return ResponseEntity.ok(WebMapper.vo(
                objectifs.valider(utilisateur.id(), id, saisie.getDate(), WebMapper.details(saisie),
                        saisie.getQuantite())));
    }

    @Override
    public ResponseEntity<ObjectifVO> annulerValidation(Long id, LocalDate date) {
        return ResponseEntity.ok(WebMapper.vo(objectifs.annuler(utilisateur.id(), id, date)));
    }

    @Override
    public ResponseEntity<HistoriqueVO> historiqueObjectif(Long id, String mois) {
        YearMonth m = mois == null ? null : YearMonth.parse(mois);
        return ResponseEntity.ok(WebMapper.vo(objectifs.historique(utilisateur.id(), id, m)));
    }

    @Override
    public ResponseEntity<StatistiquesVO> statistiquesObjectif(Long id) {
        return ResponseEntity.ok(WebMapper.vo(objectifs.statistiques(utilisateur.id(), id)));
    }
}
