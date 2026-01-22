// Backfill script to populate page_id for existing subscribers
// Run with: node scripts/backfill-subscriber-page-id.js

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillSubscriberPageIds() {
    console.log('🔄 Starting subscriber page_id backfill...\n');

    // Step 1: Get all subscribers with NULL page_id
    const { data: subscribers, error: subError } = await supabase
        .from('subscribers')
        .select('id, external_id, workspace_id, name')
        .is('page_id', null);

    if (subError) {
        console.error('❌ Error fetching subscribers:', subError.message);
        return;
    }

    console.log(`📊 Found ${subscribers?.length || 0} subscribers with NULL page_id\n`);

    if (!subscribers || subscribers.length === 0) {
        console.log('✅ No subscribers need backfilling!');
        return;
    }

    let updated = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
        // Fallback: If workspace has only one connected page, use that
        const { data: pages } = await supabase
            .from('connected_pages')
            .select('id, name')
            .eq('workspace_id', subscriber.workspace_id);

        if (pages && pages.length >= 1) {
            // Use the first page for this workspace
            const { error: updateError } = await supabase
                .from('subscribers')
                .update({ page_id: pages[0].id })
                .eq('id', subscriber.id);

            if (updateError) {
                console.error(`  ❌ Failed to update ${subscriber.name}: ${updateError.message}`);
                failed++;
            } else {
                console.log(`  ✅ Updated: ${subscriber.name} -> page: ${pages[0].name} (${pages[0].id})`);
                updated++;
            }
        } else {
            console.log(`  ⚠️ Skipped: ${subscriber.name} - no connected page found for workspace`);
            failed++;
        }
    }

    console.log(`\n📈 Backfill complete: ${updated} updated, ${failed} skipped/failed`);
}

backfillSubscriberPageIds().catch(console.error);
