/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Play, 
  Square, 
  Download, 
  Settings2, 
  Volume2, 
  Languages, 
  User, 
  Activity, 
  Cpu, 
  X,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSpeech, TTSOptions, TTSVoice } from './services/ttsService';

const VOICES: { id: TTSVoice; name: string; desc: string }[] = [
  { id: 'Puck', name: 'Puck', desc: 'Lively & Youthful' },
  { id: 'Charon', name: 'Charon', desc: 'Resonant & Mature' },
  { id: 'Kore', name: 'Kore', desc: 'Balanced & Clear' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Bold & Authoritative' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Soft & Airy' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export default function App() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<TTSVoice>('Kore');
  const [language, setLanguage] = useState('en');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize Audio Context on first interaction
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
  };

  const decodeAudio = async (base64: string) => {
    const audioData = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
    if (!audioContextRef.current) initAudio();
    const buffer = await audioContextRef.current!.decodeAudioData(audioData);
    audioBufferRef.current = buffer;
    
    // Also create a downloadable blob
    const blob = new Blob([audioData], { type: 'audio/wav' });
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(blob));
  };

  const playAudio = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    // Stop existing playback
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    
    // Apply speed and pitch
    // rate = speed
    // detune = pitch (1 semitone = 100 cents, detune takes cents)
    // For simple pitch adjustment without complex time-stretching, we just change playbackRate
    // But then speed and pitch are coupled. 
    // If the user wants separate pitch/speed, we'd need an offline audio process or a script processor.
    // For now, we'll use playbackRate as a combination or just speed factor.
    source.playbackRate.value = speed;
    
    // Detune adds semitone shifts
    // pitch shift of 1.0 means 0 cents offset
    // 0.5 is -1octave (-1200 cents), 2.0 is +1octave (1200 cents)
    const cents = Math.log2(pitch) * 1200;
    source.detune.value = cents;

    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    
    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      setIsPlaying(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    initAudio();
    setIsGenerating(true);
    setError(null);
    stopAudio();

    try {
      const base64 = await generateSpeech({
        text,
        voice,
        language
      });
      await decodeAudio(base64);
      playAudio();
    } catch (err) {
      console.error(err);
      setError("Failed to generate speech. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice-wave-${voice}-${Date.now()}.wav`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#151619] opacity-60">
              <Cpu size={16} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold">Neural Engine v3.1</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-[#151619] tracking-tighter uppercase leading-none">
              Incleud AI <span className="text-[#FF4444]">TTS</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4 py-2 px-4 bg-[#151619] rounded-lg border border-black/10 shadow-lg">
             <div className="flex flex-col items-end">
                <span className="text-[#8E9299] text-[10px] font-mono uppercase">Status</span>
                <span className="text-white text-xs font-mono flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-yellow-400 animate-pulse' : 'bg-[#00FF00]'}`} />
                  {isGenerating ? 'PROCESSING' : 'READY'}
                </span>
             </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Input & Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Text Input Area */}
            <section className="bg-[#151619] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                <Type size={14} className="text-[#8E9299]" />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] uppercase tracking-widest font-mono text-[#8E9299]">Input Buffer</label>
                   <span className="text-[10px] font-mono text-[#8E9299]">{text.length}/5000 chars</span>
                </div>
                
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text to synthesize..."
                  className="w-full h-48 bg-transparent text-white text-xl font-medium placeholder:text-[#333] border-none focus:ring-0 resize-none"
                />

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !text.trim()}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${
                      isGenerating || !text.trim()
                        ? 'bg-[#222] text-[#444] cursor-not-allowed'
                        : 'bg-[#FF4444] text-white hover:bg-[#FF2222] hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,68,68,0.3)]'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Activity className="animate-spin" size={20} />
                        Synthesizing
                      </>
                    ) : (
                      <>
                        <Mic size={20} />
                        Process Engine
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {audioBufferRef.current && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex gap-2"
                      >
                        <button
                          onClick={isPlaying ? stopAudio : playAudio}
                          className="w-16 h-16 flex items-center justify-center rounded-xl bg-white text-[#151619] hover:bg-[#EEE] transition-colors"
                        >
                          {isPlaying ? <Square fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
                        </button>
                        <button
                          onClick={downloadAudio}
                          className="w-16 h-16 flex items-center justify-center rounded-xl bg-[#222] text-white hover:bg-[#333] transition-colors"
                        >
                          <Download size={24} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* Visualizer / Waveform (Mock) */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] uppercase tracking-widest font-bold text-[#151619] opacity-40">Frequency Monitor</label>
                <Activity size={14} className="text-[#151619] opacity-20" />
              </div>
              <div className="h-24 flex items-end justify-between gap-1">
                {Array.from({ length: 48 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={isPlaying ? {
                      height: [
                        '20%', 
                        `${20 + Math.random() * 80}%`, 
                        `${20 + Math.random() * 40}%`,
                        '20%'
                      ]
                    } : { height: '10%' }}
                    transition={{
                      duration: 0.5 + Math.random() * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`flex-1 rounded-full ${isPlaying ? 'bg-[#FF4444]' : 'bg-[#DDD]'}`}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Parameters */}
          <aside className="space-y-6">
            
            {/* Voices Selection */}
            <section className="bg-[#151619] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <User size={16} className="text-[#FF4444]" />
                <label className="text-[10px] uppercase tracking-widest font-mono text-[#8E9299]">Persona Selection</label>
              </div>
              <div className="space-y-2">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`w-full group relative flex items-center justify-between p-3 rounded-xl transition-all border ${
                      voice === v.id 
                        ? 'bg-[#FF4444] border-transparent text-white shadow-[0_8px_16px_rgba(255,68,68,0.2)]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-[#8E9299]'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className={`text-sm font-bold ${voice === v.id ? 'text-white' : 'text-[#EEE]'}`}>{v.name}</span>
                      <span className="text-[10px] opacity-60 font-mono">{v.desc}</span>
                    </div>
                    {voice === v.id && (
                      <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Modulation Matrix */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
              <div className="flex items-center gap-2 mb-6 text-[#151619]">
                <Settings2 size={16} className="opacity-40" />
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Modulation Matrix</label>
              </div>
              
              <div className="space-y-8">
                {/* Speed Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#151619]">
                    <div className="flex items-center gap-2">
                      <Activity size={12} />
                      <span>Speech Velocity</span>
                    </div>
                    <span className="font-mono bg-[#151619] text-white px-2 py-0.5 rounded italic">{speed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#EEE] rounded-full appearance-none cursor-pointer accent-[#FF4444]"
                  />
                  <div className="flex justify-between text-[8px] text-[#CCC] font-mono">
                    <span>HALF-SPEED</span>
                    <span>NOMINAL</span>
                    <span>DOUBLE</span>
                  </div>
                </div>

                {/* Pitch Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#151619]">
                    <div className="flex items-center gap-2">
                      <Volume2 size={12} />
                      <span>Harmonic Pitch</span>
                    </div>
                    <span className="font-mono bg-[#151619] text-white px-2 py-0.5 rounded italic">{pitch.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#EEE] rounded-full appearance-none cursor-pointer accent-[#FF4444]"
                  />
                  <div className="flex justify-between text-[8px] text-[#CCC] font-mono">
                    <span>LOW RESONANCE</span>
                    <span>BALANCED</span>
                    <span>HIGH FREQ</span>
                  </div>
                </div>

                {/* Language Selection */}
                <div className="space-y-3 pt-4 border-t border-black/5">
                   <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#151619]">
                      <Languages size={12} className="opacity-40" />
                      <span>Localization</span>
                   </div>
                   <select 
                     value={language}
                     onChange={(e) => setLanguage(e.target.value)}
                     className="w-full p-3 rounded-xl bg-[#F8F8F8] border border-black/5 text-sm font-medium focus:ring-2 focus:ring-[#FF4444]/20 outline-none appearance-none"
                   >
                     {LANGUAGES.map((l) => (
                       <option key={l.code} value={l.code}>{l.name}</option>
                     ))}
                   </select>
                </div>
              </div>
            </section>
          </aside>
        </main>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#151619] text-[#FF4444] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-[#FF4444]/20 z-50 backdrop-blur-xl"
            >
              <div className="w-8 h-8 rounded-full bg-[#FF4444]/10 flex items-center justify-center">
                <X size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">System Error</span>
                <span className="text-sm font-medium text-white/90">{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-4 hover:bg-white/5 p-2 rounded-full transition-colors"
              >
                <X size={14} className="text-white/40" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="pt-8 border-t border-black/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[#8E9299]">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-widest font-mono">Core Protocol</span>
              <span className="text-[10px] font-bold text-[#151619]">GEMINI 3.1 TTS</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-widest font-mono">Audio Output</span>
              <span className="text-[10px] font-bold text-[#151619]">24.0 kHz PCM</span>
            </div>
          </div>
          <div className="text-[10px] font-mono italic">
            © 2026 INCLEUD NEURAL TECHNOLOGIES. ALL RIGHTS RESERVED.
          </div>
        </footer>
      </div>
    </div>
  );
}
