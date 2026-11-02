package com.objectifsperso.adapter.in.web;

import com.objectifsperso.adapter.in.web.api.RappelsApi;
import com.objectifsperso.adapter.in.web.vo.RappelVO;
import com.objectifsperso.application.port.in.RappelsUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
class RappelsController implements RappelsApi {

    private final RappelsUseCase rappels;
    private final UtilisateurCourant utilisateur;

    RappelsController(RappelsUseCase rappels, UtilisateurCourant utilisateur) {
        this.rappels = rappels;
        this.utilisateur = utilisateur;
    }

    @Override
    public ResponseEntity<List<RappelVO>> prochainsRappels(Integer jours) {
        int nb = jours == null ? 7 : jours;
        return ResponseEntity.ok(rappels.prochainsRappels(utilisateur.id(), nb).stream().map(WebMapper::vo).toList());
    }
}
