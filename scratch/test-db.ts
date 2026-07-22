import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file manually
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = envContent.split('\n').reduce((acc: any, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL || '';
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: reports, error: rError } = await supabase.from('penilaian_tugas').select('*');
  console.log(`Found ${reports?.length} reports in penilaian_tugas`);
  if (rError) console.error("Error fetching reports:", rError);
  
  const { data: attachments, error: aError } = await supabase.from('lampiran_tugas').select('*');
  console.log(`Found ${attachments?.length} attachments in lampiran_tugas TOTAL`);
  if (aError) console.error("Error fetching attachments:", aError);
  
  if (attachments && attachments.length > 0) {
      console.log(attachments);
  }
}

main().catch(console.error);
