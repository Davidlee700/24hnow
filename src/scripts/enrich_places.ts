import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

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

// Max places to process per run to control Google API cost
const BATCH_LIMIT = 50; 

async function enrichPlaces() {
  console.log(`Starting Data Enrichment... (Limit: ${BATCH_LIMIT} places)`);

  // Find places with MEDIUM confidence or class_type 'B' that don't have a google_place_id yet
  const { data: places, error } = await supabase
    .from('stores')
    .select('id, name, road_address, class_type, confidence_level')
    .is('google_place_id', null)
    .or('confidence_level.eq.MEDIUM,class_type.eq.B')
    .limit(BATCH_LIMIT);

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
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName'
        },
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
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'id,regularOpeningHours'
        }
      });

      const detailsData = await detailsRes.json();

      let confidence = 'MEDIUM';
      let businessHours = null;

      if (detailsData.regularOpeningHours) {
        businessHours = detailsData.regularOpeningHours;
        confidence = 'HIGH';
      }

      // 3. Update Supabase
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          google_place_id: placeId,
          business_hours: businessHours,
          confidence_level: confidence,
          verification_source: 'GOOGLE_PLACES',
          updated_at: new Date().toISOString()
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
