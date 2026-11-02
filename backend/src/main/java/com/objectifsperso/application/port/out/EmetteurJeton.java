package com.objectifsperso.application.port.out;

import com.objectifsperso.domain.model.Utilisateur;

public interface EmetteurJeton {
    String emettre(Utilisateur utilisateur);
}
