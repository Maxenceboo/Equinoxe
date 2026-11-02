package com.objectifsperso.adapter.in.web;

import com.objectifsperso.adapter.in.web.api.BilanApi;
import com.objectifsperso.adapter.in.web.vo.BilanVO;
import com.objectifsperso.application.port.in.BilanUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
class BilanController implements BilanApi {

    private final BilanUseCase bilan;
    private final UtilisateurCourant utilisateur;

    BilanController(BilanUseCase bilan, UtilisateurCourant utilisateur) {
        this.bilan = bilan;
        this.utilisateur = utilisateur;
    }

    @Override
    public ResponseEntity<BilanVO> bilanSemaine(LocalDate jour) {
        return ResponseEntity.ok(WebMapper.vo(bilan.bilan(utilisateur.id(), jour)));
    }
}
