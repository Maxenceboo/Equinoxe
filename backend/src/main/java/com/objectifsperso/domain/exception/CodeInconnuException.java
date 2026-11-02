package com.objectifsperso.domain.exception;

public class CodeInconnuException extends RuntimeException {
    public CodeInconnuException(String code) {
        super("Aucun objectif partagé avec le code " + code);
    }
}
