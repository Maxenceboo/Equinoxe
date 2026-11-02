package com.objectifsperso.application.port.out;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface Horloge {
    LocalDateTime maintenant();

    default LocalDate aujourdhui() { return maintenant().toLocalDate(); }
}
