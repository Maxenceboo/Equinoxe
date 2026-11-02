package com.objectifsperso.adapter.out.horloge;

import com.objectifsperso.application.port.out.Horloge;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
class HorlogeSysteme implements Horloge {

    private final ZoneId zone;

    HorlogeSysteme(@Value("${app.fuseau:Europe/Paris}") String fuseau) { this.zone = ZoneId.of(fuseau); }

    @Override
    public LocalDateTime maintenant() { return LocalDateTime.now(zone); }
}
