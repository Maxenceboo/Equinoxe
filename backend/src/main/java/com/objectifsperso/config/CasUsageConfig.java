package com.objectifsperso.config;

import com.objectifsperso.application.port.in.AuthUseCase;
import com.objectifsperso.application.port.in.GererObjectifsUseCase;
import com.objectifsperso.application.port.in.RappelsUseCase;
import com.objectifsperso.application.port.out.EmetteurJeton;
import com.objectifsperso.application.port.out.HacheurMotDePasse;
import com.objectifsperso.application.port.out.Horloge;
import com.objectifsperso.application.port.out.ObjectifRepository;
import com.objectifsperso.application.port.out.UtilisateurRepository;
import com.objectifsperso.application.service.AuthService;
import com.objectifsperso.application.service.ObjectifService;
import com.objectifsperso.application.service.RappelService;
import com.objectifsperso.domain.service.CalculProgression;
import com.objectifsperso.domain.service.PlanificateurRappels;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Branche le domaine et l'application (sans Spring) sur les adaptateurs. */
@Configuration
class CasUsageConfig {

    @Bean
    GererObjectifsUseCase gererObjectifs(ObjectifRepository repository, Horloge horloge) {
        return new ObjectifService(repository, horloge, new CalculProgression());
    }

    @Bean
    RappelsUseCase rappels(ObjectifRepository repository, Horloge horloge) {
        return new RappelService(repository, horloge, new PlanificateurRappels());
    }

    @Bean
    AuthUseCase auth(UtilisateurRepository utilisateurs, HacheurMotDePasse hacheur, EmetteurJeton emetteur) {
        return new AuthService(utilisateurs, hacheur, emetteur);
    }
}
