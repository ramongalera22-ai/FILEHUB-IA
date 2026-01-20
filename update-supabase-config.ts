// Script para actualizar la configuración de Ollama en Supabase
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer variables de entorno del archivo .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;
const OLLAMA_URL = envVars.VITE_OLLAMA_URL;
const OLLAMA_MODEL = envVars.VITE_OLLAMA_MODEL;

console.log('📊 Actualizando configuración de Ollama en Supabase...\n');

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateOllamaConfig() {
    try {
        console.log('📝 Configuración a guardar:');
        console.log(`   URL: ${OLLAMA_URL}`);
        console.log(`   Modelo: ${OLLAMA_MODEL}\n`);

        // Obtener todos los perfiles
        const { data: profiles, error: fetchError } = await supabase
            .from('profiles')
            .select('id, email');

        if (fetchError) {
            console.error('❌ Error al obtener perfiles:', fetchError);
            return;
        }

        if (!profiles || profiles.length === 0) {
            console.log('⚠️  No se encontraron perfiles en la base de datos');
            return;
        }

        console.log(`✅ Encontrados ${profiles.length} perfil(es)\n`);

        // Actualizar cada perfil
        for (const profile of profiles) {
            const ollamaConfig = {
                baseUrl: OLLAMA_URL,
                model: OLLAMA_MODEL,
                isActive: true,
                apiKey: ''
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    settings: {
                        ollama_config: ollamaConfig
                    }
                })
                .eq('id', profile.id);

            if (updateError) {
                console.error(`❌ Error actualizando perfil ${profile.email}:`, updateError);
            } else {
                console.log(`✅ Perfil actualizado: ${profile.email}`);
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 ¡Configuración de Ollama actualizada en Supabase!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateOllamaConfig();
