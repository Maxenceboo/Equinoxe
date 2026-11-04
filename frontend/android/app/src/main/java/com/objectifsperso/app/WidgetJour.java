package com.objectifsperso.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Color;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** Widget « Aujourd'hui » : tes objectifs, cochés quand ils sont faits. Toucher ouvre l'app pour cocher. */
public class WidgetJour extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager gestionnaire, int[] ids) {
        dessiner(ctx, gestionnaire, ids);
    }

    static void dessiner(Context ctx, AppWidgetManager gestionnaire, int[] ids) {
        if (ids.length == 0) return;
        JSONObject r = Widgets.lire(ctx);
        RemoteViews vue = new RemoteViews(ctx.getPackageName(), R.layout.widget_jour);
        vue.setOnClickPendingIntent(R.id.widget_jour, Widgets.ouvrirApp(ctx));
        JSONArray liste = r == null ? null : r.optJSONArray("objectifs");
        if (liste == null || liste.length() == 0) {
            vue.setTextViewText(R.id.jour_compte, "");
            vue.setTextViewText(R.id.jour_liste, r == null ? "Ouvre l'app pour voir tes objectifs" : "Aucun objectif pour l'instant");
        } else {
            int faits = 0;
            SpannableStringBuilder texte = new SpannableStringBuilder();
            for (int i = 0; i < liste.length(); i++) {
                JSONObject o = liste.optJSONObject(i);
                if (o == null) continue;
                boolean fait = o.optBoolean("fait");
                if (fait) faits++;
                if (texte.length() > 0) texte.append('\n');
                int debut = texte.length();
                texte.append(fait ? "●  " : "○  ").append(o.optString("nom"));
                if (fait) {
                    texte.setSpan(new ForegroundColorSpan(Color.argb(130, 255, 255, 255)), debut, texte.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                }
            }
            vue.setTextViewText(R.id.jour_compte, faits + "/" + liste.length());
            vue.setTextViewText(R.id.jour_liste, texte);
        }
        for (int id : ids) gestionnaire.updateAppWidget(id, vue);
    }
}
