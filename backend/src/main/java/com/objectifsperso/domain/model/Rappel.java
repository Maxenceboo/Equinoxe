package com.objectifsperso.domain.model;

import java.time.LocalDateTime;

public record Rappel(Long objectifId, String nomObjectif, LocalDateTime dateHeure, String message) {
}
