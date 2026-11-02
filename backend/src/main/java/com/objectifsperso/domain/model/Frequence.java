package com.objectifsperso.domain.model;

/** Fréquence d'un objectif : X fois par semaine, ou tous les jours (7 par semaine). */
public record Frequence(TypeFrequence type, int cible) {

    public Frequence {
        if (type == null) throw new IllegalArgumentException("La fréquence est obligatoire");
        if (type == TypeFrequence.QUOTIDIEN) cible = 7;
        if (cible < 1 || cible > 7) throw new IllegalArgumentException("La cible doit être entre 1 et 7 par semaine");
    }

    public static Frequence parSemaine(int fois) { return new Frequence(TypeFrequence.PAR_SEMAINE, fois); }

    public static Frequence quotidien() { return new Frequence(TypeFrequence.QUOTIDIEN, 7); }

    public int parSemaine() { return cible; }
}
