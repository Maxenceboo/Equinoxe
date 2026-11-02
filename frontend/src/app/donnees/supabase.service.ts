import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase.config';
import { Database } from './database.types';

/** Client Supabase unique ; la session de connexion est gardée dans le stockage local. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient<Database> = createClient<Database>(SUPABASE.url, SUPABASE.cle, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'objectifs.session' },
  });
}
