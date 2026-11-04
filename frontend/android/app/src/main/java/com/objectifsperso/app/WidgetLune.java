package com.objectifsperso.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** Widget « Ma lune » : ta lune à la phase de ton niveau, tes points et les objectifs tenus cette semaine. */
public class WidgetLune extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager gestionnaire, int[] ids) {
        dessiner(ctx, gestionnaire, ids);
    }

    static void dessiner(Context ctx, AppWidgetManager gestionnaire, int[] ids) {
        if (ids.length == 0) return;
        JSONObject r = Widgets.lire(ctx);
        RemoteViews vue = new RemoteViews(ctx.getPackageName(), R.layout.widget_lune);
        vue.setOnClickPendingIntent(R.id.widget_lune, Widgets.ouvrirApp(ctx));
        if (r == null) {
            vue.setImageViewBitmap(R.id.lune_image, Widgets.lune(0f, 240));
            vue.setTextViewText(R.id.lune_niveau, "Équinoxe");
            vue.setTextViewText(R.id.lune_points, "Ouvre l'app pour voir ta lune");
            vue.setViewVisibility(R.id.lune_semaine, View.GONE);
        } else {
            JSONArray liste = r.optJSONArray("objectifs");
            int total = liste == null ? 0 : liste.length();
            vue.setImageViewBitmap(R.id.lune_image, Widgets.lune((float) r.optDouble("phase", 0), 240));
            vue.setTextViewText(R.id.lune_niveau, r.optString("nomNiveau", "Équinoxe"));
            vue.setTextViewText(R.id.lune_points, r.optInt("points") + " points");
            vue.setViewVisibility(R.id.lune_semaine, total > 0 ? View.VISIBLE : View.GONE);
            vue.setTextViewText(R.id.lune_semaine, r.optInt("tenus") + "/" + total + " tenus cette semaine");
        }
        for (int id : ids) gestionnaire.updateAppWidget(id, vue);
    }
}
