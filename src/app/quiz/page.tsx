'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { HelpCircle, CheckCircle2, XCircle, Trophy, RefreshCw, Lightbulb } from 'lucide-react';
import PositionBadge from '@/components/PositionBadge';

interface PlayerIndex {
  name: string;
  seasons: string[];
  positions: string[];
  primaryPosition: string;
  total_points: number;
  goals: number;
  assists: number;
  clean_sheets: number;
}

type GameState = 'playing' | 'correct' | 'revealed';

function stripDisambiguation(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

function normalise(str: string): string {
  return str.toLowerCase().trim();
}

function firstLetterHint(name: string): string {
  const clean = stripDisambiguation(name);
  return clean
    .split(' ')
    .map((word) => word[0] + '_'.repeat(Math.max(0, word.length - 1)))
    .join(' ');
}

function formatSeasonRange(seasons: string[]): string {
  if (seasons.length === 0) return '';
  const sorted = [...seasons].sort();
  return `${sorted[0]} to ${sorted[sorted.length - 1]}`;
}

function pickRandom(players: PlayerIndex[], exclude: Set<number>): { player: PlayerIndex; index: number } | null {
  const available = players
    .map((p, i) => i)
    .filter((i) => !exclude.has(i));
  if (available.length === 0) return null;
  const idx = available[Math.floor(Math.random() * available.length)];
  return { player: players[idx], index: idx };
}

export default function QuizPage() {
  const [allPlayers, setAllPlayers] = useState<PlayerIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [currentPlayer, setCurrentPlayer] = useState<PlayerIndex | null>(null);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [gameState, setGameState] = useState<GameState>('playing');

  // Score tracking
  const [score, setScore] = useState(0);
  const [streak, setStreakState] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  // Input / guesses
  const [inputValue, setInputValue] = useState('');
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);

  // Hints
  const [hintsUsed, setHintsUsed] = useState<0 | 1 | 2>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load top 200 players
  useEffect(() => {
    fetch('/data/search-index.json')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load player data');
        return r.json();
      })
      .then((data: PlayerIndex[]) => {
        setAllPlayers(data.slice(0, 200));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const startNewRound = useCallback(
    (players: PlayerIndex[], used: Set<number>) => {
      const result = pickRandom(players, used);
      if (!result) {
        // All players used — reset the pool but keep score
        const fresh = new Set<number>();
        const freshResult = pickRandom(players, fresh);
        if (!freshResult) return;
        setUsedIndices(new Set([freshResult.index]));
        setCurrentPlayer(freshResult.player);
      } else {
        setUsedIndices(new Set(Array.from(used).concat(result.index)));
        setCurrentPlayer(result.player);
      }
      setGameState('playing');
      setInputValue('');
      setWrongGuesses([]);
      setHintsUsed(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    []
  );

  // Start first round when players loaded
  useEffect(() => {
    if (allPlayers.length > 0 && currentPlayer === null) {
      startNewRound(allPlayers, new Set());
    }
  }, [allPlayers, currentPlayer, startNewRound]);

  // Auto-hint after wrong guesses
  useEffect(() => {
    if (wrongGuesses.length === 2 && hintsUsed < 1) {
      setHintsUsed(1);
    } else if (wrongGuesses.length === 4 && hintsUsed < 2) {
      setHintsUsed(2);
    }
  }, [wrongGuesses.length, hintsUsed]);

  const handleGuess = () => {
    if (!currentPlayer || gameState !== 'playing') return;
    const guess = inputValue.trim();
    if (!guess) return;

    const cleanName = stripDisambiguation(currentPlayer.name);
    const isCorrect = normalise(guess) === normalise(cleanName);

    if (isCorrect) {
      setGameState('correct');
      setScore((s) => s + 1);
      setStreakState((s) => s + 1);
      setTotalAttempts((t) => t + 1);
    } else {
      // Shake animation
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setWrongGuesses((prev) => [...prev, guess]);
      setInputValue('');
    }
  };

  const handleGiveUp = () => {
    if (gameState !== 'playing') return;
    setGameState('revealed');
    setStreakState(0);
    setTotalAttempts((t) => t + 1);
  };

  const handleNext = () => {
    startNewRound(allPlayers, usedIndices);
  };

  const handleHint = () => {
    if (hintsUsed === 0) setHintsUsed(1);
    else if (hintsUsed === 1) setHintsUsed(2);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleGuess();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#00ff87] mx-auto mb-3" />
          <p className="text-muted">Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="glass rounded-xl p-6 text-center">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentPlayer) return null;

  const cleanName = stripDisambiguation(currentPlayer.name);
  const seasonRange = formatSeasonRange(currentPlayer.seasons);
  const canHint = gameState === 'playing' && hintsUsed < 2;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-5 h-5 text-[#00ff87]" />
          <h1 className="text-2xl font-bold gradient-text">FPL Player Quiz</h1>
        </div>
        <p className="text-muted text-sm">Guess the player from their career stats</p>
      </div>

      {/* Score bar */}
      <div className="glass rounded-xl px-4 py-3 mb-5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted">
            Score:{' '}
            <span className="text-foreground font-semibold">{score}</span>
          </span>
          <span className="text-muted">
            Streak:{' '}
            <span className={`font-semibold ${streak > 0 ? 'text-[#00ff87]' : 'text-foreground'}`}>
              {streak}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted">
          <Trophy className="w-4 h-4" />
          <span>
            {totalAttempts} played
          </span>
        </div>
      </div>

      {/* Player card */}
      <div className="glass rounded-xl p-5 mb-5 animate-fade-in">
        {/* Player name / hidden */}
        <div className="mb-5 text-center">
          {gameState === 'playing' ? (
            <div className="inline-flex items-center gap-2 bg-border/40 rounded-lg px-5 py-2">
              <span className="text-2xl font-bold tracking-widest text-muted select-none">???</span>
            </div>
          ) : gameState === 'correct' ? (
            <div className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#00ff87]" />
              <span className="text-2xl font-bold text-[#00ff87]">{cleanName}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{cleanName}</span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Position */}
          <div className="bg-card rounded-lg p-3 border border-border flex flex-col items-center gap-1.5">
            <span className="text-muted text-xs uppercase tracking-wider">Position</span>
            <PositionBadge position={currentPlayer.primaryPosition} />
          </div>

          {/* Seasons */}
          <div className="bg-card rounded-lg p-3 border border-border flex flex-col items-center gap-1 col-span-2 sm:col-span-1">
            <span className="text-muted text-xs uppercase tracking-wider">Seasons active</span>
            <span className="text-foreground font-semibold text-base">
              {currentPlayer.seasons.length} season{currentPlayer.seasons.length !== 1 ? 's' : ''}
            </span>
            <span className="text-muted text-xs text-center">{seasonRange}</span>
          </div>

          {/* Career points */}
          <div className="bg-card rounded-lg p-3 border border-border flex flex-col items-center gap-1">
            <span className="text-muted text-xs uppercase tracking-wider">Career pts</span>
            <span className="text-[#00ff87] font-bold text-xl">{currentPlayer.total_points.toLocaleString()}</span>
          </div>

          {/* Goals */}
          <div className="bg-card rounded-lg p-3 border border-border flex flex-col items-center gap-1">
            <span className="text-muted text-xs uppercase tracking-wider">Goals</span>
            <span className="text-foreground font-bold text-xl">{currentPlayer.goals}</span>
          </div>

          {/* Assists */}
          <div className="bg-card rounded-lg p-3 border border-border flex flex-col items-center gap-1">
            <span className="text-muted text-xs uppercase tracking-wider">Assists</span>
            <span className="text-foreground font-bold text-xl">{currentPlayer.assists}</span>
          </div>

          {/* Clean sheets */}
          <div className="bg-card rounded-lg p-3 border border-border flex flex-col items-center gap-1 col-span-2 sm:col-span-1">
            <span className="text-muted text-xs uppercase tracking-wider">Clean sheets</span>
            <span className="text-foreground font-bold text-xl">{currentPlayer.clean_sheets}</span>
          </div>
        </div>
      </div>

      {/* Hint panel */}
      {hintsUsed > 0 && (
        <div className="glass rounded-xl p-4 mb-4 border border-yellow-500/20 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">
              Hint {hintsUsed}/2
            </span>
          </div>
          {hintsUsed >= 1 && (
            <div className="mb-2">
              <span className="text-muted text-xs uppercase tracking-wider">Seasons played</span>
              <p className="text-foreground text-sm mt-0.5">
                {[...currentPlayer.seasons].sort().join(', ')}
              </p>
            </div>
          )}
          {hintsUsed >= 2 && (
            <div>
              <span className="text-muted text-xs uppercase tracking-wider">Name letters</span>
              <p className="text-foreground font-mono text-sm mt-0.5 tracking-widest">
                {firstLetterHint(currentPlayer.name)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      {gameState === 'playing' && (
        <div className="mb-4">
          <div
            className={`flex gap-2 ${shaking ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
            style={
              shaking
                ? { animation: 'shake 0.4s ease-in-out' }
                : {}
            }
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type player name…"
              className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:border-[#00ff87]/60 transition-colors"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={handleGuess}
              disabled={!inputValue.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#00ff87] text-black font-semibold text-sm hover:bg-[#00ff87]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Guess
            </button>
          </div>

          {/* Wrong guesses */}
          {wrongGuesses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {wrongGuesses.map((g, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-0.5"
                >
                  <XCircle className="w-3 h-3" />
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {canHint && (
              <button
                onClick={handleHint}
                className="flex items-center gap-1.5 text-xs text-yellow-400 border border-yellow-500/30 rounded-lg px-3 py-1.5 hover:bg-yellow-500/10 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Hint {hintsUsed === 0 ? '(seasons)' : '(letters)'}
              </button>
            )}
            <button
              onClick={handleGiveUp}
              className="flex items-center gap-1.5 text-xs text-muted border border-border rounded-lg px-3 py-1.5 hover:text-foreground hover:border-border/80 transition-colors ml-auto"
            >
              <XCircle className="w-3.5 h-3.5" />
              Give up
            </button>
          </div>
        </div>
      )}

      {/* Result + Next */}
      {(gameState === 'correct' || gameState === 'revealed') && (
        <div className="mb-4 animate-fade-in">
          <div
            className={`glass rounded-xl p-4 mb-3 border ${
              gameState === 'correct' ? 'border-[#00ff87]/30' : 'border-red-500/30'
            }`}
          >
            {gameState === 'correct' ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#00ff87] shrink-0" />
                <p className="text-[#00ff87] font-medium">
                  Correct! {wrongGuesses.length === 0 ? 'First guess!' : `Got it in ${wrongGuesses.length + 1} guesses.`}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 font-medium">
                  The answer was <strong>{cleanName}</strong>.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00ff87] text-black font-semibold hover:bg-[#00ff87]/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Next Player →
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
