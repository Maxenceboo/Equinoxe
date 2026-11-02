package com.objectifsperso.adapter.in.web;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ParcoursApiTest {

    @Autowired
    MockMvc mvc;

    private String inscrire(String email) throws Exception {
        String reponse = mvc.perform(post("/auth/inscription").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"motDePasse\":\"motdepasse123\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(reponse, "$.token");
    }

    @Test
    void parcours_complet() throws Exception {
        String jeton = inscrire("max@exemple.com");

        String cree = mvc.perform(post("/objectifs").header("Authorization", jeton)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"Sport\",\"categorie\":\"SPORT\",\"typeFrequence\":\"PAR_SEMAINE\",\"cible\":3,\"heure\":\"18:00\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.progression.realisees").value(0))
                .andExpect(jsonPath("$.couleur").value("#ffffff"))
                .andReturn().getResponse().getContentAsString();
        Integer id = JsonPath.read(cree, "$.id");

        mvc.perform(post("/objectifs/" + id + "/validations").header("Authorization", jeton)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sport\":{\"typeSeance\":\"COURSE\",\"dureeMinutes\":30,\"ressenti\":\"MOYEN\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progression.realisees").value(1))
                .andExpect(jsonPath("$.progression.faitAujourdhui").value(true));

        String aujourdhui = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Paris")).toString();
        mvc.perform(get("/objectifs/" + id + "/historique").header("Authorization", jeton))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validations[0].sport.typeSeance").value("COURSE"))
                .andExpect(jsonPath("$.validations[0].sport.dureeMinutes").value(30));

        mvc.perform(get("/rappels").header("Authorization", jeton)).andExpect(status().isOk());

        mvc.perform(delete("/objectifs/" + id + "/validations/" + aujourdhui).header("Authorization", jeton))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progression.realisees").value(0));

        mvc.perform(get("/objectifs").header("Authorization", jeton))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void un_utilisateur_ne_voit_pas_les_objectifs_des_autres() throws Exception {
        String a = inscrire("a@exemple.com");
        String b = inscrire("b@exemple.com");
        String cree = mvc.perform(post("/objectifs").header("Authorization", a).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"Lire\",\"categorie\":\"AUTRE\",\"typeFrequence\":\"QUOTIDIEN\",\"cible\":1,\"heure\":\"21:00\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cible").value(7))
                .andReturn().getResponse().getContentAsString();
        Integer id = JsonPath.read(cree, "$.id");
        mvc.perform(get("/objectifs/" + id).header("Authorization", b)).andExpect(status().isNotFound());
    }

    @Test
    void saisie_invalide_et_acces_sans_jeton() throws Exception {
        String jeton = inscrire("c@exemple.com");
        mvc.perform(post("/objectifs").header("Authorization", jeton).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"\",\"categorie\":\"SPORT\",\"typeFrequence\":\"PAR_SEMAINE\",\"cible\":9,\"heure\":\"25:00\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SAISIE_INVALIDE"));
        mvc.perform(get("/objectifs")).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/connexion").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"c@exemple.com\",\"motDePasse\":\"mauvais-mdp\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/inscription").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"C@exemple.com\",\"motDePasse\":\"motdepasse123\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void objectif_chiffre_bilan_et_statistiques() throws Exception {
        String jeton = inscrire("chiffres@exemple.com");
        String cree = mvc.perform(post("/objectifs").header("Authorization", jeton).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"Courir\",\"categorie\":\"SPORT\",\"typeFrequence\":\"PAR_SEMAINE\",\"cible\":3,"
                                + "\"heure\":\"18:00\",\"mesure\":\"KM\",\"objectifQuantite\":20,\"rappelAuto\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mesure").value("KM"))
                .andExpect(jsonPath("$.objectifQuantite").value(20.0))
                .andExpect(jsonPath("$.heureRappel").value("18:00"))
                .andReturn().getResponse().getContentAsString();
        Integer id = JsonPath.read(cree, "$.id");

        mvc.perform(post("/objectifs/" + id + "/validations").header("Authorization", jeton)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantite\":7.5,\"sport\":{\"typeSeance\":\"COURSE\",\"dureeMinutes\":45}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progression.quantiteSemaine").value(7.5));

        mvc.perform(get("/objectifs/" + id + "/statistiques").header("Authorization", jeton))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSeances").value(1))
                .andExpect(jsonPath("$.totalMinutes").value(45))
                .andExpect(jsonPath("$.totalQuantite").value(7.5))
                .andExpect(jsonPath("$.mois.length()").value(6))
                .andExpect(jsonPath("$.types[0].type").value("COURSE"));

        String aujourdhui = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Paris")).toString();
        mvc.perform(get("/bilan").param("jour", aujourdhui).header("Authorization", jeton))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.seances").value(1))
                .andExpect(jsonPath("$.lignes[0].quantite").value(7.5));
    }

    @Test
    void binome_par_code_de_partage() throws Exception {
        String moi = inscrire("lea@exemple.com");
        String ami = inscrire("sam@exemple.com");
        String cree = mvc.perform(post("/objectifs").header("Authorization", moi).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"Sport\",\"categorie\":\"SPORT\",\"typeFrequence\":\"PAR_SEMAINE\",\"cible\":3,\"heure\":\"18:00\"}"))
                .andReturn().getResponse().getContentAsString();
        Integer id = JsonPath.read(cree, "$.id");

        String partage = mvc.perform(post("/objectifs/" + id + "/partage").header("Authorization", moi))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.abonnes").value(0))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(partage, "$.code");
        // Le même code à chaque fois
        mvc.perform(post("/objectifs/" + id + "/partage").header("Authorization", moi))
                .andExpect(jsonPath("$.code").value(code));

        mvc.perform(post("/binomes").header("Authorization", moi).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/binomes").header("Authorization", ami).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"ZZZZZZ\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/binomes").header("Authorization", ami).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code.toLowerCase() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ami").value("Lea"))
                .andExpect(jsonPath("$.progression.cible").value(3));

        mvc.perform(get("/binomes").header("Authorization", ami))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(post("/objectifs/" + id + "/partage").header("Authorization", moi))
                .andExpect(jsonPath("$.abonnes").value(1));
        // L'ami ne peut pas modifier l'objectif partagé
        mvc.perform(get("/objectifs/" + id).header("Authorization", ami)).andExpect(status().isNotFound());

        mvc.perform(delete("/binomes/" + id).header("Authorization", ami)).andExpect(status().isNoContent());
        mvc.perform(get("/binomes").header("Authorization", ami))
                .andExpect(jsonPath("$.length()").value(0));
    }
}
