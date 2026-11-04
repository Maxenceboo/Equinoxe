package com.objectifsperso.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Reçoit de l'app le résumé du jour et redessine les widgets de l'écran d'accueil. */
@CapacitorPlugin(name = "Widgets")
public class WidgetsPlugin extends Plugin {
    @PluginMethod
    public void mettreAJour(PluginCall call) {
        String donnees = call.getString("donnees", "");
        Widgets.enregistrer(getContext(), donnees);
        Widgets.toutRedessiner(getContext());
        call.resolve();
    }
}
