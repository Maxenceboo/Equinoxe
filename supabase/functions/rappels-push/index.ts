// Envoie les rappels de la version web (iPhone) par Web Push.
//  - { action: "cle" }      : renvoie la clé publique VAPID (créée au premier appel)
//  - { action: "envoyer" }  : envoie les rappels arrivés à leur heure (appelé chaque minute par pg_cron)
// Aucune donnée n'est renvoyée à l'appelant : l'appel « envoyer » peut donc rester public.
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

/** Clés VAPID stockées en base (table sans accès public) ; générées une seule fois. */
async function clesVapid(): Promise<CryptoKeyPair> {
  const lues = await db.from('config_push').select('valeur').eq('cle', 'vapid').maybeSingle();
  if (lues.error) throw lues.error;
  if (!lues.data) {
    const nouvelles = await webpush.exportVapidKeys(await webpush.generateVapidKeys({ extractable: true }));
    // Si deux appels arrivent en même temps, le premier gagne et l'autre relit
    await db.from('config_push').upsert({ cle: 'vapid', valeur: nouvelles }, { onConflict: 'cle', ignoreDuplicates: true });
    return clesVapid();
  }
  return webpush.importVapidKeys(lues.data.valeur, { extractable: true });
}

async function envoyer(): Promise<number> {
  const maintenant = new Date();
  // Un rappel en retard de plus d'une heure n'a plus de sens : on le marque sans l'envoyer
  await db.from('rappel_push').update({ envoye_le: maintenant.toISOString() })
    .is('envoye_le', null).lt('quand', new Date(maintenant.getTime() - 3600_000).toISOString());

  const { data: rappels, error } = await db.from('rappel_push')
    .select('id, utilisateur_id, titre, corps, route')
    .is('envoye_le', null).lte('quand', maintenant.toISOString()).limit(500);
  if (error) throw error;
  if (!rappels?.length) return 0;

  // On les marque d'abord : un appel suivant ne les renverra pas
  await db.from('rappel_push').update({ envoye_le: maintenant.toISOString() }).in('id', rappels.map((r) => r.id));

  const utilisateurs = [...new Set(rappels.map((r) => r.utilisateur_id))];
  const { data: abonnements } = await db.from('abonnement_push')
    .select('id, utilisateur_id, endpoint, p256dh, auth').in('utilisateur_id', utilisateurs);
  if (!abonnements?.length) return 0;

  const serveur = await webpush.ApplicationServer.new({
    contactInformation: 'mailto:contact@equinoxe-app.fr',
    vapidKeys: await clesVapid(),
  });

  let envoyes = 0;
  const perimes: number[] = [];
  await Promise.all(rappels.flatMap((r) =>
    abonnements.filter((a) => a.utilisateur_id === r.utilisateur_id).map(async (a) => {
      try {
        await serveur.subscribe({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } })
          .pushTextMessage(JSON.stringify({ titre: r.titre, corps: r.corps, route: r.route ?? '' }), { ttl: 3600 });
        envoyes++;
      } catch (e) {
        if (e instanceof webpush.PushMessageError && (e.isGone() || e.response.status === 404)) perimes.push(a.id);
        else console.error('envoi', e);
      }
    })
  ));
  if (perimes.length) await db.from('abonnement_push').delete().in('id', perimes);
  return envoyes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { action } = await req.json().catch(() => ({ action: 'envoyer' }));
    const corps = action === 'cle'
      ? { cle: await webpush.exportApplicationServerKey(await clesVapid()) }
      : { envoyes: await envoyer() };
    return new Response(JSON.stringify(corps), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ erreur: 'indisponible' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
