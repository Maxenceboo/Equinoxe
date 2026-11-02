package com.objectifsperso.application.port.in;

public interface AuthUseCase {

    record SessionOuverte(String token, String email) { }

    SessionOuverte inscrire(String email, String motDePasse);

    SessionOuverte connecter(String email, String motDePasse);
}
