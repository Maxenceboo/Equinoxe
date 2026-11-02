package com.objectifsperso.application.port.in;

import com.objectifsperso.domain.model.Categorie;
import com.objectifsperso.domain.model.Frequence;

import java.time.LocalTime;

public record ObjectifCommande(String nom, Categorie categorie, Frequence frequence, LocalTime heure, String couleur) {
}
