import { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, Languages } from 'lucide-react';
import toast from 'react-hot-toast';

const VoiceInput = ({ onTranscript }) => {
    // INTERNAL LANGUAGE STATE - User must select before using voice
    const [selectedLanguage, setSelectedLanguage] = useState(null); // null = not selected
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [inputMode, setInputMode] = useState('text');

    const recognitionRef = useRef(null);
    const isInitialized = useRef(false);
    const shouldStop = useRef(false);
    const currentLanguage = useRef(selectedLanguage);

    const initializeRecognition = (selectedLang) => {
        // Check if browser supports speech recognition
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return null;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // STRICT LANGUAGE CONTROL
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Set STRICT language based on user selection
        // English: 'en' (NOT 'en-IN') for pure English
        // Hindi: 'hi-IN' for pure Devanagari Hindi
        recognition.lang = selectedLang === 'hi' ? 'hi-IN' : 'en';

        console.log(`🔒 STRICT Language Mode: ${recognition.lang}`);
        console.log(`📝 Transcription will be in: ${selectedLang === 'hi' ? 'Hindi (देवनागरी)' : 'English (A-Z)'}`);

        recognition.onstart = () => {
            console.log(`✅ Voice recognition started in STRICT ${currentLanguage.current === 'hi' ? 'HINDI' : 'ENGLISH'} mode`);
            shouldStop.current = false;
            setInputMode('voice');
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPiece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcriptPiece + ' ';
                } else {
                    interim += transcriptPiece;
                }
            }

            if (final) {
                setTranscript(prev => {
                    const newTranscript = prev + final;
                    onTranscript(newTranscript);
                    return newTranscript;
                });
            }

            setInterimTranscript(interim);
        };

        recognition.onerror = (event) => {
            console.error('❌ Speech recognition error:', event.error);

            shouldStop.current = true;
            setIsListening(false);
            setInterimTranscript('');

            switch (event.error) {
                case 'not-allowed':
                case 'service-not-allowed':
                    toast.error('🎤 Microphone access denied. Please allow microphone in browser settings.');
                    break;
                case 'network':
                    console.warn('Network error from Speech API');
                    toast('⚠️ Voice service temporarily unavailable. Please try again.', { icon: '🎤' });
                    break;
                case 'no-speech':
                    toast('No speech detected. Please speak clearly and try again.', { icon: '🎤' });
                    break;
                case 'audio-capture':
                    toast.error('🎤 No microphone found. Please connect a microphone.');
                    break;
                case 'aborted':
                    console.log('Recognition aborted by user');
                    break;
                default:
                    toast.error(`Voice error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            console.log('Voice recognition ended');
            setInterimTranscript('');

            // Auto-restart if user is still listening and no errors occurred
            if (isListening && !shouldStop.current) {
                console.log('🔄 Restarting recognition...');
                setTimeout(() => {
                    if (isListening && !shouldStop.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (err) {
                            console.error('Failed to restart:', err);
                            setIsListening(false);
                        }
                    }
                }, 200);
            } else {
                console.log('🛑 Not restarting (stopped by user or error)');
                setIsListening(false);
            }
        };

        return recognition;
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error('⚠️ Voice input not supported. Please use Chrome or Edge browser.');
            return;
        }

        // ENFORCE LANGUAGE SELECTION
        if (!selectedLanguage) {
            toast.error('⚠️ Please select a language first (English or Hindi)');
            return;
        }

        if (isListening) {
            toast.error('Already listening! Click Stop to end recording.');
            return;
        }

        // Update current language
        currentLanguage.current = selectedLanguage;

        // Always reinitialize to ensure correct language
        recognitionRef.current = initializeRecognition(selectedLanguage);
        isInitialized.current = true;

        if (!recognitionRef.current) {
            toast.error('Failed to initialize voice recognition');
            return;
        }

        // Reset state
        setTranscript('');
        setInterimTranscript('');
        shouldStop.current = false;
        setIsListening(true);

        try {
            console.log(`🎤 Starting STRICT ${selectedLanguage === 'hi' ? 'HINDI (देवनागरी)' : 'ENGLISH'} recognition`);

            recognitionRef.current.start();

            const langInfo = selectedLanguage === 'hi'
                ? 'Hindi (देवनागरी) - Will transcribe in Devanagari script only'
                : 'English - Will transcribe in English only';

            toast.success(
                `🔒 Strict ${selectedLanguage === 'hi' ? 'HINDI' : 'ENGLISH'} Mode\n${langInfo}`,
                { duration: 3000 }
            );
        } catch (error) {
            console.error('Failed to start recognition:', error);
            setIsListening(false);
            shouldStop.current = true;

            if (error.name === 'InvalidStateError') {
                toast.error('Voice recognition already running. Please wait a moment and try again.');
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore
                }
                recognitionRef.current = null;
                isInitialized.current = false;
            } else {
                toast.error('Failed to start voice input. Please try again.');
            }
        }
    };

    const stopListening = () => {
        shouldStop.current = true;
        setIsListening(false);

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                toast.success('🛑 Recording stopped', { duration: 2000 });
                setInputMode('text');
            } catch (error) {
                console.error('Failed to stop recognition:', error);
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* LANGUAGE SELECTION - MANDATORY */}
            <div>
                <label className="block text-sm font-medium mb-3 flex items-center space-x-2">
                    <Languages className="w-4 h-4 text-primary-400" />
                    <span>Select Transcription Language *</span>
                </label>
                <div className="flex space-x-3">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedLanguage('en');
                            setTranscript('');
                            setInterimTranscript('');
                            toast.success('🇬🇧 English transcription selected');
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${selectedLanguage === 'en'
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/50'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                            }`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-lg">🇬🇧</span>
                            <span>English</span>
                        </div>
                        {selectedLanguage === 'en' && (
                            <div className="text-xs mt-1 opacity-90">A-Z transcription only</div>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedLanguage('hi');
                            setTranscript('');
                            setInterimTranscript('');
                            toast.success('🇮🇳 Hindi (देवनागरी) transcription selected');
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${selectedLanguage === 'hi'
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/50'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                            }`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-lg">🇮🇳</span>
                            <span>हिन्दी (Hindi)</span>
                        </div>
                        {selectedLanguage === 'hi' && (
                            <div className="text-xs mt-1 opacity-90">देवनागरी script only</div>
                        )}
                    </button>
                </div>
                {!selectedLanguage && (
                    <p className="text-xs text-yellow-400 mt-2 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Please select a language to enable voice input</span>
                    </p>
                )}
            </div>
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={!selectedLanguage}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${!selectedLanguage
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                            : isListening
                                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                                : 'bg-primary-500 hover:bg-primary-600 text-white'
                        }`}
                    title={!selectedLanguage ? 'Please select a language first' : ''}
                >
                    {isListening ? (
                        <>
                            <MicOff className="w-5 h-5" />
                            <span>Stop Recording</span>
                        </>
                    ) : (
                        <>
                            <Mic className="w-5 h-5" />
                            <span>Start Voice Input</span>
                        </>
                    )}
                </button>

                {inputMode === 'voice' && transcript && (
                    <span className="text-xs text-primary-400 px-3 py-1 bg-primary-500/10 rounded-full">
                        Voice Mode
                    </span>
                )}
            </div>

            {isListening && (
                <div className="flex items-center space-x-2 text-sm text-primary-400 bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <div className="flex-1">
                        <p className="font-medium">
                            🔒 Listening in {selectedLanguage === 'hi' ? 'HINDI (हिंदी)' : 'ENGLISH'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {selectedLanguage === 'hi'
                                ? 'Transcribing in Devanagari script (देवनागरी)'
                                : 'Transcribing in English (A-Z)'
                            }
                        </p>
                    </div>
                </div>
            )}

            {(transcript || interimTranscript) && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2 flex items-center space-x-2">
                        <span>
                            {selectedLanguage === 'hi' ? 'Hindi Transcript (देवनागरी):' : 'English Transcript:'}
                        </span>
                        {interimTranscript && <span className="text-primary-400">(speaking...)</span>}
                    </p>
                    <p className="text-sm leading-relaxed">
                        {transcript}
                        {interimTranscript && (
                            <span className="text-gray-400 italic"> {interimTranscript}</span>
                        )}
                    </p>
                </div>
            )}

            {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
                <div className="flex items-start space-x-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Voice Input Not Supported</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Please use Google Chrome or Microsoft Edge for voice input.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceInput;
