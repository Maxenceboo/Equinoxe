package com.objectifsperso.domain.exception;

public class ObjectifIntrouvableException extends RuntimeException {
    public ObjectifIntrouvableException(Long id) { super("Objectif " + id + " introuvable"); }
}
