import 'regenerator-runtime/runtime';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, Copy, Trash2, StopCircle, RefreshCw, Zap, Save, FileAudio } from 'lucide-react';
import { toast } from 'sonner';
import { useReactMediaRecorder } from 'react-media-recorder';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

const Speetch = () => {
    // State
    const [text, setText] = useState('');
    const [audioBlobToSave, setAudioBlobToSave] = useState<Blob | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);

    // Form data for saving
    const [title, setTitle] = useState('');
    const [dossierId, setDossierId] = useState('');

    // --- Browser Detection ---
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    useEffect(() => {
        const agent = navigator.userAgent.toLowerCase();
        const isChrome = agent.includes('chrome') && !agent.includes('edg') && !agent.includes('opr') && !agent.includes('arc');
        const isArc = agent.includes('arc');

        if (isArc) {
            toast.warning("Info Navigateur : Sur Arc, la transcription directe peut ne pas fonctionner. Utilisez Google Chrome si vous rencontrez des problèmes.", { duration: 8000 });
        } else if (isSafari) {
            toast.warning("Info Safari : L'enregistrement audio peut être silencieux pendant la dictée. Utilisez Google Chrome pour un résultat optimal.", { duration: 8000 });
        } else if (!isChrome) {
            toast.info("Pour une expérience optimale (Transcription + Audio), nous recommandons Google Chrome.", { duration: 6000 });
        }
    }, []);

    // --- Live Speech Hook ---
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    useEffect(() => {
        if (!browserSupportsSpeechRecognition) {
            toast.error("Votre navigateur ne supporte pas la reconnaissance vocale.");
        }
    }, [browserSupportsSpeechRecognition]);

    // --- Audio Recorder Hook ---
    // Attempt to determine best mimeType for Safari compatibility
    const getMimeType = () => {
        if (typeof MediaRecorder === 'undefined') return undefined;
        const types = [
            'audio/mp4',
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/wav'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return undefined;
    };

    const handleStopRecording = (blobUrl: string, blob: Blob) => {
        setAudioBlobToSave(blob);
    };

    const {
        status: recorderStatus,
        startRecording,
        stopRecording,
        mediaBlobUrl,
        clearBlobUrl
    } = useReactMediaRecorder({
        audio: true,
        onStop: handleStopRecording,
        mediaRecorderOptions: {
            mimeType: getMimeType()
        }
    });

    // --- Synchronization Logic (Key Fix for Safari/Arc issues) ---
    // We start Recording FIRST, then launch Speech Recognition once recording is active.

    useEffect(() => {
        // If recording just started and we aren't listening yet, start listening
        if (recorderStatus === 'recording' && !listening) {
            SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' });
        }
        // If recording stopped and we are still listening, stop listening
        if (recorderStatus !== 'recording' && listening) {
            SpeechRecognition.stopListening();
        }
    }, [recorderStatus, listening]);

    // Update text from live transcript
    useEffect(() => {
        // We let the UI display combined text, but we don't commit it to state until verified or stopped
        // Actually, for simplicity in the UI, we just render (text + transcript)
    }, [transcript]);

    // Track previous listening state to handle the "Stop" event exactly once
    const prevListening = useRef(listening);

    useEffect(() => {
        // Only run when we transition from LISTENING (true) to NOT LISTENING (false)
        if (prevListening.current && !listening) {
            if (transcript) {
                setText(prev => {
                    const newText = prev + (prev ? ' ' : '') + transcript;
                    return newText;
                });
                resetTranscript();
            }
        }
        // Update ref for next render
        prevListening.current = listening;
    }, [listening, transcript, resetTranscript]);


    // --- Actions ---

    const saveToDatabase = async () => {
        if (!audioBlobToSave && !text) {
            toast.error("Rien à sauvegarder (ni audio ni texte).");
            return;
        }

        if (!title) {
            toast.error("Veuillez donner un titre.");
            return;
        }

        setIsSaving(true);
        const formData = new FormData();
        if (audioBlobToSave) {
            formData.append('audio', audioBlobToSave, 'vocal.wav');
        }
        formData.append('titre_vocal', title);
        formData.append('text_retranscrit', text);
        // formData.append('date_vocal', new Date().toISOString()); // Backend uses now()
        if (dossierId) formData.append('dossier_id', dossierId);

        try {
            await axios.post('http://127.0.0.1:8000/api/speeches', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success("Enregistré avec succès !");
            setSaveDialogOpen(false);
            setTitle('');
            setDossierId('');
        } catch (error: any) {
            console.error("Erreur sauvegarde", error);
            toast.error("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        const textToCopy = listening ? text + ' ' + transcript : text;
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        toast.success("Copié !");
    };

    const handleClear = () => {
        if (window.confirm('Tout effacer ?')) {
            setText('');
            resetTranscript();
            setAudioBlobToSave(null);
            clearBlobUrl();
            toast.info("Effacé.");
        }
    };

    const toggleRecording = () => {
        if (recorderStatus === 'recording' || listening) {
            // STOP Everything
            stopRecording();
            // SpeechRecognition will stop via effect
        } else {
            // START Recording First -> Effect starts Speech
            startRecording();
        }
    };

    const isActive = recorderStatus === 'recording';

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Speech to Text</h1>
                        <p className="text-muted-foreground">
                            Transcription directe et Enregistrement audio
                        </p>
                    </div>
                </div>
            </div>

            <Card className="border-border/50 shadow-lg relative overflow-hidden">
                {isActive && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-loading-bar" />
                )}

                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Dictée Vocale
                        </CardTitle>
                        <CardDescription>
                            {isActive ? 'Enregistrement en cours...' : 'Prêt à enregistrer'}
                        </CardDescription>
                    </div>

                    {isActive && (
                        <div className="flex items-center gap-2 text-red-500 font-medium">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Live + Rec
                        </div>
                    )}
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="relative min-h-[400px] border rounded-md bg-muted/20 focus-within:ring-1 focus-within:ring-ring transition-all">
                        <Textarea
                            value={listening ? text + (text ? ' ' : '') + transcript : text}
                            onChange={(e) => setText(e.target.value)}
                            className="min-h-[400px] resize-none border-0 bg-transparent focus-visible:ring-0 p-6 text-lg leading-relaxed font-mono"
                            placeholder="Appuyez sur Démarrer et parlez... Votre texte s'affichera ici."
                        />
                    </div>

                    {/* Audio Player Review */}
                    {mediaBlobUrl && !isActive && (
                        <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                            <FileAudio className="h-6 w-6 text-primary" />
                            <audio src={mediaBlobUrl} controls className="w-full h-8" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Audio enregistré</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-4">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                disabled={!text && !transcript}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Copier
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClear}
                                disabled={!text && !transcript && !audioBlobToSave}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Effacer
                            </Button>
                        </div>

                        <div className="flex gap-4">
                            {/* Save Button */}
                            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" disabled={isActive || (!text && !audioBlobToSave)}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Sauvegarder
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Sauvegarder le Vocal</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Titre du vocal</Label>
                                            <Input
                                                placeholder="Ex: Réunion client..."
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>ID Dossier (Optionnel)</Label>
                                            <Input
                                                placeholder="123"
                                                value={dossierId}
                                                onChange={(e) => setDossierId(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Annuler</Button>
                                        <Button onClick={saveToDatabase} disabled={isSaving}>
                                            {isSaving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                            Sauvegarder
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button
                                size="lg"
                                onClick={toggleRecording}
                                variant={isActive ? "destructive" : "default"}
                                className={`min-w-[150px] transition-all ${isActive ? 'ring-2 ring-destructive ring-offset-2' : ''}`}
                            >
                                {isActive ? <StopCircle className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
                                {isActive ? 'Arrêter' : 'Démarrer'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Speetch;
