package com.objectifsperso.adapter.out.security;

import com.objectifsperso.application.port.out.HacheurMotDePasse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class BCryptHacheur implements HacheurMotDePasse {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public String hacher(String motDePasse) { return encoder.encode(motDePasse); }

    @Override
    public boolean correspond(String motDePasse, String hache) { return encoder.matches(motDePasse, hache); }
}
