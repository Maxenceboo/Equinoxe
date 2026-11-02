package com.objectifsperso.adapter.out.persistence;

import com.objectifsperso.application.port.out.UtilisateurRepository;
import com.objectifsperso.domain.model.Utilisateur;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component
class UtilisateurPersistenceAdapter implements UtilisateurRepository {

    private final SpringDataUtilisateurRepository jpa;

    UtilisateurPersistenceAdapter(SpringDataUtilisateurRepository jpa) { this.jpa = jpa; }

    @Override
    @Transactional(readOnly = true)
    public Optional<Utilisateur> trouverParEmail(String email) {
        return jpa.findByEmail(email).map(e -> new Utilisateur(e.id, e.email, e.motDePasseHache));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Utilisateur> trouverParId(Long id) {
        return jpa.findById(id).map(e -> new Utilisateur(e.id, e.email, e.motDePasseHache));
    }

    @Override
    @Transactional
    public Utilisateur enregistrer(Utilisateur u) {
        UtilisateurEntity e = new UtilisateurEntity();
        e.id = u.id();
        e.email = u.email();
        e.motDePasseHache = u.motDePasseHache();
        UtilisateurEntity saved = jpa.save(e);
        return new Utilisateur(saved.id, saved.email, saved.motDePasseHache);
    }
}
