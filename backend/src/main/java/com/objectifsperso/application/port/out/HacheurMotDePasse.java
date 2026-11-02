package com.objectifsperso.application.port.out;

public interface HacheurMotDePasse {
    String hacher(String motDePasse);

    boolean correspond(String motDePasse, String hache);
}
