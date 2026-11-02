package com.objectifsperso.domain.exception;

public class EmailDejaUtiliseException extends RuntimeException {
    public EmailDejaUtiliseException() { super("Cet email a déjà un compte"); }
}
