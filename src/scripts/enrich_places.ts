import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { crossVerifyHours } from '../utils/hoursVerification';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Note: You should use a SERVICE_ROLE_KEY if you have RLS enabled.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

if (!googleApiKey) {
  console.error("Missing GOOGLE_PLACES_API_KEY in .env.local");
  console.error("Please add it to use the Data Enrichment Script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Max places to process per run (기본 50 — 무료 API 크레딧 절약)
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const BATCH_LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

async function enrichPlaces() {
  const regionArg = args.find(a => a.startsWith('--region='));
  const region = regionArg ? regionArg.split('=')[1] : null;

  console.log(`Starting Data Enrichment... (Limit: ${BATCH_LIMIT} places)`);
  if (region) console.log(`Filtering by region: ${region}`);

  // 대상: google_place_id 없고, confidence가 HIGH가 아닌 매장
  // EXTENDED, UNKNOWN operation_type도 포함하여 영업시간 보강
  let queryBuilder = supabase
    .from('stores')
    .select('id, name, road_address, class_type, confidence_level, operation_type, raw_hours')
    .is('google_place_id', null)
    .or('confidence_level.eq.MEDIUM,confidence_level.eq.LOW,confidence_level.is.null,operation_type.eq.EXTENDED,operation_type.eq.UNKNOWN')
    .order('last_hours_verified_at', { ascending: true, nullsFirst: true });

  if (region) {
    queryBuilder = queryBuilder.like('road_address', `%${region}%`);
  }

  const { data: places, error } = await queryBuilder.limit(BATCH_LIMIT);

  if (error) {
    console.error("Error fetching places:", error);
    return;
  }

  if (!places || places.length === 0) {
    console.log("No eligible places found for enrichment.");
    return;
  }

  console.log(`Found ${places.length} places to process.`);

  let processedCount = 0;
  let errorCount = 0;

  for (const place of places) {
    try {
      // 1. Text Search API to find Place ID
      const query = encodeURIComponent(`${place.name} ${place.road_address || ''}`.trim());
      // Using Places API (New)
      const searchRes = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey as string,
          'X-Goog-FieldMask': 'places.id,places.displayName'
        } as any,
        body: JSON.stringify({
          textQuery: decodeURIComponent(query),
          languageCode: 'ko'
        })
      });

      const searchData = await searchRes.json();
      
      if (!searchData.places || searchData.places.length === 0) {
        console.log(`[Skip] No Google Place found for: ${place.name}`);
        // Consider updating the record to mark it as searched so we don't query it again,
        // but for now we skip.
        continue;
      }

      const placeId = searchData.places[0].id;

      // 2. Place Details API to get hours
      const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=ko`, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': googleApiKey as string,
          'X-Goog-FieldMask': 'id,regularOpeningHours'
        } as any
      });

      const detailsData = await detailsRes.json();

      let confidence = 'MEDIUM';
      let businessHours = null;

      if (detailsData.regularOpeningHours) {
        businessHours = detailsData.regularOpeningHours;
        confidence = 'HIGH';
      }

      // 교차 검증: 기존 raw_hours (카카오/네이버) + Google hours
      const verification = crossVerifyHours({
        kakaoHours: (place as any).raw_hours ?? null,
        googleHours: businessHours,
        category: (place as any).category ?? '',
      });

      const updatedOperationType = verification.operation_type !== 'UNKNOWN'
        ? verification.operation_type
        : undefined;

      const now = new Date().toISOString();

      // 3. Update Supabase
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          google_place_id: placeId,
          business_hours: businessHours,
          confidence_level: businessHours ? 'HIGH' : confidence,
          hours_source: verification.hours_source ?? 'GOOGLE',
          verification_source: 'GOOGLE_PLACES',
          ...(updatedOperationType ? { operation_type: updatedOperationType } : {}),
          is_24h: updatedOperationType === '24H',
          last_hours_verified_at: now,
          last_verified_at: now,
        })
        .eq('id', place.id);

      if (updateError) {
        console.error(`Failed to update ${place.name}:`, updateError);
        errorCount++;
      } else {
        console.log(`[Success] Updated ${place.name} (ID: ${placeId}, Hours: ${confidence === 'HIGH' ? 'Found' : 'Not Found'})`);
        processedCount++;
      }

    } catch (e) {
      console.error(`Error processing ${place.name}:`, e);
      errorCount++;
    }

    // Rate limiting delay (e.g. 200ms)
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nEnrichment complete!`);
  console.log(`Processed: ${processedCount}, Errors: ${errorCount}`);
}

enrichPlaces().catch(console.error);
