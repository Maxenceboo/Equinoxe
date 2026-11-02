package com.objectifsperso.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/** Une semaine du lundi au dimanche. */
public record Semaine(LocalDate lundi) {

    public static Semaine de(LocalDate date) {
        return new Semaine(date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)));
    }

    public LocalDate dimanche() { return lundi.plusDays(6); }

    public boolean contient(LocalDate date) { return !date.isBefore(lundi) && !date.isAfter(dimanche()); }

    public Semaine suivante() { return new Semaine(lundi.plusWeeks(1)); }

    public Semaine precedente() { return new Semaine(lundi.minusWeeks(1)); }
}
