package com.objectifsperso.adapter.in.web;

import com.objectifsperso.adapter.in.web.vo.ErreurVO;
import com.objectifsperso.domain.exception.CodeInconnuException;
import com.objectifsperso.domain.exception.EmailDejaUtiliseException;
import com.objectifsperso.domain.exception.IdentifiantsInvalidesException;
import com.objectifsperso.domain.exception.ObjectifIntrouvableException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

import java.time.format.DateTimeParseException;

@RestControllerAdvice
class GestionErreurs {

    @ExceptionHandler(ObjectifIntrouvableException.class)
    ResponseEntity<ErreurVO> introuvable(ObjectifIntrouvableException e) {
        return erreur(HttpStatus.NOT_FOUND, "INTROUVABLE", e.getMessage());
    }

    @ExceptionHandler(CodeInconnuException.class)
    ResponseEntity<ErreurVO> codeInconnu(CodeInconnuException e) {
        return erreur(HttpStatus.NOT_FOUND, "CODE_INCONNU", e.getMessage());
    }

    @ExceptionHandler(EmailDejaUtiliseException.class)
    ResponseEntity<ErreurVO> emailPris(EmailDejaUtiliseException e) {
        return erreur(HttpStatus.CONFLICT, "EMAIL_DEJA_UTILISE", e.getMessage());
    }

    @ExceptionHandler(IdentifiantsInvalidesException.class)
    ResponseEntity<ErreurVO> identifiants(IdentifiantsInvalidesException e) {
        return erreur(HttpStatus.UNAUTHORIZED, "IDENTIFIANTS_INVALIDES", e.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, DateTimeParseException.class})
    ResponseEntity<ErreurVO> saisie(RuntimeException e) {
        return erreur(HttpStatus.BAD_REQUEST, "SAISIE_INVALIDE", e.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HandlerMethodValidationException.class,
            HttpMessageNotReadableException.class})
    ResponseEntity<ErreurVO> validation(Exception e) {
        return erreur(HttpStatus.BAD_REQUEST, "SAISIE_INVALIDE", "Certains champs sont invalides");
    }

    private static ResponseEntity<ErreurVO> erreur(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErreurVO(code, message));
    }
}
