package com.objectifsperso.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/** Outils communs aux deux widgets : le résumé enregistré par l'app, le dessin de la lune, l'ouverture de l'app. */
final class Widgets {
    private static final String FICHIER = "equinoxe_widgets";
    private static final String CLE = "resume";

    private Widgets() {}

    static void enregistrer(Context ctx, String donnees) {
        ctx.getSharedPreferences(FICHIER, Context.MODE_PRIVATE).edit().putString(CLE, donnees).apply();
    }

    /** Le résumé, ou null si personne n'est connecté. Un autre jour, plus rien n'est coché. */
    static JSONObject lire(Context ctx) {
        String brut = ctx.getSharedPreferences(FICHIER, Context.MODE_PRIVATE).getString(CLE, "");
        if (brut == null || brut.isEmpty()) return null;
        try {
            JSONObject r = new JSONObject(brut);
            String jour = new SimpleDateFormat("yyyy-MM-dd", Locale.FRANCE).format(new Date());
            if (!jour.equals(r.optString("date"))) {
                JSONArray liste = r.optJSONArray("objectifs");
                if (liste != null) {
                    for (int i = 0; i < liste.length(); i++) liste.getJSONObject(i).put("fait", false);
                }
            }
            return r;
        } catch (Exception e) {
            return null;
        }
    }

    static void toutRedessiner(Context ctx) {
        AppWidgetManager gestionnaire = AppWidgetManager.getInstance(ctx);
        WidgetLune.dessiner(ctx, gestionnaire, gestionnaire.getAppWidgetIds(new ComponentName(ctx, WidgetLune.class)));
        WidgetJour.dessiner(ctx, gestionnaire, gestionnaire.getAppWidgetIds(new ComponentName(ctx, WidgetJour.class)));
    }

    static PendingIntent ouvrirApp(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Même dessin que dans l'app : un contour, et la partie éclairée à droite selon la phase (0 à 1). */
    static Bitmap lune(float phase, int taille) {
        Bitmap image = Bitmap.createBitmap(taille, taille, Bitmap.Config.ARGB_8888);
        Canvas toile = new Canvas(image);
        float c = taille / 2f;
        float r = taille * 0.44f;

        Paint contour = new Paint(Paint.ANTI_ALIAS_FLAG);
        contour.setStyle(Paint.Style.STROKE);
        contour.setStrokeWidth(Math.max(2f, taille / 60f));
        contour.setColor(Color.argb(90, 255, 255, 255));
        toile.drawCircle(c, c, r, contour);

        float f = Math.max(0f, Math.min(1f, phase));
        if (f > 0f) {
            float rx = Math.abs(1 - 2 * f) * r;
            Path eclairee = new Path();
            eclairee.moveTo(c, c - r);
            eclairee.arcTo(new RectF(c - r, c - r, c + r, c + r), -90, 180);
            if (rx < 0.5f) {
                eclairee.lineTo(c, c - r);
            } else {
                // Limite d'ombre : demi-ellipse vers la gauche (lune gibbeuse) ou vers la droite (croissant)
                eclairee.arcTo(new RectF(c - rx, c - r, c + rx, c + r), 90, f > 0.5f ? 180 : -180);
            }
            eclairee.close();
            Paint blanc = new Paint(Paint.ANTI_ALIAS_FLAG);
            blanc.setColor(Color.WHITE);
            toile.drawPath(eclairee, blanc);
        }
        return image;
    }
}
