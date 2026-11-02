package com.objectifsperso.adapter.in.web;

import com.objectifsperso.adapter.in.web.api.AuthApi;
import com.objectifsperso.adapter.in.web.vo.IdentifiantsVO;
import com.objectifsperso.adapter.in.web.vo.SessionVO;
import com.objectifsperso.application.port.in.AuthUseCase;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
class AuthController implements AuthApi {

    private final AuthUseCase auth;

    AuthController(AuthUseCase auth) { this.auth = auth; }

    @Override
    public ResponseEntity<SessionVO> inscription(IdentifiantsVO id) {
        AuthUseCase.SessionOuverte s = auth.inscrire(id.getEmail(), id.getMotDePasse());
        return ResponseEntity.status(HttpStatus.CREATED).body(new SessionVO(s.token(), s.email()));
    }

    @Override
    public ResponseEntity<SessionVO> connexion(IdentifiantsVO id) {
        AuthUseCase.SessionOuverte s = auth.connecter(id.getEmail(), id.getMotDePasse());
        return ResponseEntity.ok(new SessionVO(s.token(), s.email()));
    }
}
