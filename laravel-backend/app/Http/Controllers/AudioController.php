<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AudioController extends Controller
{
    public function transcribe(Request $request)
    {
        set_time_limit(300); // 5 minutes max

        try {
            $request->validate(['audio' => 'required|file']);

            // 1. Sauvegarde du fichier audio
            $file = $request->file('audio');
            $filename = 'rec_' . time() . '.wav';

            // On sauvegarde dans storage/app/temp_audio
            $file->storeAs('temp_audio', $filename, 'local');

            // Définition des chemins
            $absoluteAudioPath = storage_path('app/temp_audio/' . $filename);
            $outputDir = storage_path('app/temp_audio');

            // --- VOS CHEMINS MAC (NE TOUCHEZ PAS SI CA MARCHAIT AVANT) ---
            $whisperBin = '/Library/Frameworks/Python.framework/Versions/3.14/bin/whisper';
            $env = [
                'PATH' => '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Library/Frameworks/Python.framework/Versions/3.14/bin'
            ];

            // 2. Commande Whisper
            // --model tiny (pour la vitesse)
            // --fp16 False (obligatoire Mac)
            $command = "\"{$whisperBin}\" \"{$absoluteAudioPath}\" --model tiny --output_format txt --output_dir \"{$outputDir}\" --fp16 False";

            Log::info("Lancement Whisper : " . $command);

            $result = Process::timeout(300)->env($env)->run($command);

            if ($result->failed()) {
                Log::error("Erreur Whisper Output: " . $result->output());
                Log::error("Erreur Whisper Error: " . $result->errorOutput());
                return response()->json(['error' => 'Erreur process Python', 'debug' => $result->errorOutput()], 500);
            }

            // 3. LA CORRECTION EST ICI 
            // Whisper remplace l'extension .wav par .txt
            // On enlève .wav du nom de fichier original pour trouver le .txt
            $filenameWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
            $txtPath = $outputDir . '/' . $filenameWithoutExt . '.txt';

            if (file_exists($txtPath)) {
                $text = file_get_contents($txtPath);

                // Nettoyage
                @unlink($absoluteAudioPath);
                @unlink($txtPath);

                return response()->json(['text' => trim($text)]);
            } else {
                // Debug avancé : lister les fichiers présents pour comprendre
                $filesInDir = scandir($outputDir);
                return response()->json([
                    'error' => 'Fichier texte introuvable',
                    'expected_path' => $txtPath,
                    'files_present' => $filesInDir // Cela nous dira comment Whisper a nommé le fichier
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error("Erreur PHP : " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}