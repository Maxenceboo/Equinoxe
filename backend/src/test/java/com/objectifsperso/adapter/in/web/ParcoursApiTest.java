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
                .andExpect(jsonPath("$.couleur").value("#3b82f6"))
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
}
