package com.objectifsperso.config;

import com.objectifsperso.application.port.in.AuthUseCase;
import com.objectifsperso.application.port.in.BilanUseCase;
import com.objectifsperso.application.port.in.BinomesUseCase;
import com.objectifsperso.application.port.out.AbonnementRepository;
import com.objectifsperso.application.service.BilanService;
import com.objectifsperso.application.service.BinomeService;
import com.objectifsperso.domain.service.CalculBilan;
import com.objectifsperso.domain.service.CalculStatistiques;
import com.objectifsperso.domain.service.ConseilCible;
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
        return new ObjectifService(repository, horloge, new CalculProgression(), new ConseilCible(),
                new CalculStatistiques());
    }

    @Bean
    BilanUseCase bilan(ObjectifRepository repository, Horloge horloge) {
        return new BilanService(repository, horloge, new CalculBilan(new CalculProgression(), new ConseilCible()));
    }

    @Bean
    BinomesUseCase binomes(ObjectifRepository objectifs, AbonnementRepository abonnements,
                           UtilisateurRepository utilisateurs, Horloge horloge) {
        return new BinomeService(objectifs, abonnements, utilisateurs, horloge, new CalculProgression());
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
