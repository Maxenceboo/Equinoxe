package com.objectifsperso.adapter.in.web;

import com.objectifsperso.adapter.in.web.api.BinomesApi;
import com.objectifsperso.adapter.in.web.vo.CodeBinomeVO;
import com.objectifsperso.adapter.in.web.vo.ObjectifSuiviVO;
import com.objectifsperso.adapter.in.web.vo.PartageVO;
import com.objectifsperso.application.port.in.BinomesUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
class BinomesController implements BinomesApi {

    private final BinomesUseCase binomes;
    private final UtilisateurCourant utilisateur;

    BinomesController(BinomesUseCase binomes, UtilisateurCourant utilisateur) {
        this.binomes = binomes;
        this.utilisateur = utilisateur;
    }

    @Override
    public ResponseEntity<PartageVO> partagerObjectif(Long id) {
        return ResponseEntity.ok(WebMapper.vo(binomes.partager(utilisateur.id(), id)));
    }

    @Override
    public ResponseEntity<List<ObjectifSuiviVO>> listerBinomes() {
        return ResponseEntity.ok(binomes.suivis(utilisateur.id()).stream().map(WebMapper::vo).toList());
    }

    @Override
    public ResponseEntity<ObjectifSuiviVO> rejoindreBinome(CodeBinomeVO code) {
        return ResponseEntity.ok(WebMapper.vo(binomes.rejoindre(utilisateur.id(), code.getCode())));
    }

    @Override
    public ResponseEntity<Void> quitterBinome(Long objectifId) {
        binomes.quitter(utilisateur.id(), objectifId);
        return ResponseEntity.noContent().build();
    }
}
