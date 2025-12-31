"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dumbbell,
  Plus,
  Flame,
  X,
  Target,
  Trash2,
  Check,
  Timer,
  TrendingUp,
  TrendingDown,
  History,
  Trophy,
} from "lucide-react";

type ExerciseType = "weighted" | "bodyweight" | "timed";
type AssistanceBand = "none" | "heavy" | "medium" | "light";

const BAND_LABELS: Record<AssistanceBand, string> = {
  none: "No Band",
  heavy: "Heavy Band",
  medium: "Medium Band",
  light: "Light Band",
};

interface HistoryEntry {
  id: string;
  date: string;
  weight?: number;
  reps?: number;
  sets?: number;
  assistanceBand?: AssistanceBand;
  duration?: number;
}

interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  category: string;
  icon: string;
  currentWeight?: number;
  currentReps?: number;
  currentSets?: number;
  assistanceBand?: AssistanceBand;
  currentDuration?: number;
  history: HistoryEntry[];
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PRESET_EXERCISES: Exercise[] = [
  { id: "squat", name: "Squat", type: "weighted", category: "Legs", icon: "🦵", history: [] },
  { id: "deadlift", name: "Deadlift", type: "weighted", category: "Back", icon: "💪", history: [] },
  { id: "bench", name: "Bench Press", type: "weighted", category: "Chest", icon: "🏋️", history: [] },
  { id: "ohp", name: "Overhead Press", type: "weighted", category: "Shoulders", icon: "🙌", history: [] },
  { id: "row", name: "Barbell Row", type: "weighted", category: "Back", icon: "🚣", history: [] },
  { id: "curl", name: "Bicep Curl", type: "weighted", category: "Arms", icon: "💪", history: [] },
  { id: "tricep", name: "Tricep Extension", type: "weighted", category: "Arms", icon: "🔱", history: [] },
  { id: "pullup", name: "Pull-up", type: "bodyweight", category: "Back", icon: "🧗", history: [] },
  { id: "pushup", name: "Push-up", type: "bodyweight", category: "Chest", icon: "🫸", history: [] },
  { id: "dip", name: "Dip", type: "bodyweight", category: "Chest", icon: "⬇️", history: [] },
  { id: "plank", name: "Plank", type: "timed", category: "Core", icon: "🧘", history: [] },
  { id: "lunge", name: "Lunges", type: "bodyweight", category: "Legs", icon: "🚶", history: [] },
  { id: "wallsit", name: "Wall Sit", type: "timed", category: "Legs", icon: "🪑", history: [] },
];

const MOTIVATIONAL_QUOTES = [
  "Every rep counts. Every set matters. You're building something incredible.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Champions are made when no one is watching.",
  "Your only limit is you. Break through it.",
  "Consistency beats intensity. Keep showing up.",
  "The iron never lies. Put in the work, see the results.",
  "You're not just lifting weights, you're lifting your potential.",
  "Progress, not perfection. Every workout is a step forward.",
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function getPR(history: HistoryEntry[], type: ExerciseType): { weight?: number; reps?: number; duration?: number } | null {
  if (history.length === 0) return null;
  
  if (type === "weighted") {
    const maxWeight = Math.max(...history.filter(h => h.weight).map(h => h.weight!));
    return maxWeight > 0 ? { weight: maxWeight } : null;
  }
  
  if (type === "bodyweight") {
    const maxReps = Math.max(...history.filter(h => h.reps).map(h => h.reps!));
    return maxReps > 0 ? { reps: maxReps } : null;
  }
  
  if (type === "timed") {
    const maxDuration = Math.max(...history.filter(h => h.duration).map(h => h.duration!));
    return maxDuration > 0 ? { duration: maxDuration } : null;
  }
  
  return null;
}

function isNewPR(entry: HistoryEntry, history: HistoryEntry[], type: ExerciseType): boolean {
  const previousEntries = history.filter(h => h.id !== entry.id);
  if (previousEntries.length === 0) return true;
  
  if (type === "weighted" && entry.weight) {
    const prevMax = Math.max(...previousEntries.filter(h => h.weight).map(h => h.weight!), 0);
    return entry.weight > prevMax;
  }
  
  if (type === "bodyweight" && entry.reps) {
    const prevMax = Math.max(...previousEntries.filter(h => h.reps).map(h => h.reps!), 0);
    return entry.reps > prevMax;
  }
  
  if (type === "timed" && entry.duration) {
    const prevMax = Math.max(...previousEntries.filter(h => h.duration).map(h => h.duration!), 0);
    return entry.duration > prevMax;
  }
  
  return false;
}

function getProgressFromPrevious(entry: HistoryEntry, prevEntry: HistoryEntry | null, type: ExerciseType): "up" | "down" | "same" | null {
  if (!prevEntry) return null;
  
  if (type === "weighted" && entry.weight && prevEntry.weight) {
    if (entry.weight > prevEntry.weight) return "up";
    if (entry.weight < prevEntry.weight) return "down";
    return "same";
  }
  
  if (type === "bodyweight" && entry.reps && prevEntry.reps) {
    if (entry.reps > prevEntry.reps) return "up";
    if (entry.reps < prevEntry.reps) return "down";
    return "same";
  }
  
  if (type === "timed" && entry.duration && prevEntry.duration) {
    if (entry.duration > prevEntry.duration) return "up";
    if (entry.duration < prevEntry.duration) return "down";
    return "same";
  }
  
  return null;
}

export default function GymTracker() {
  const [exercises, setExercises] = useState<Exercise[]>(PRESET_EXERCISES);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showBandModal, setShowBandModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [motivationalQuote, setMotivationalQuote] = useState("");
  const [showMotivation, setShowMotivation] = useState(false);

  // Weight form
  const [formWeight, setFormWeight] = useState<string>("");
  const [formReps, setFormReps] = useState<string>("");
  const [formSets, setFormSets] = useState<string>("");
  const [formBand, setFormBand] = useState<AssistanceBand>("none");
  const [formMinutes, setFormMinutes] = useState<string>("0");
  const [formSeconds, setFormSeconds] = useState<string>("0");

  // Custom exercise form
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>("weighted");
  const [newExerciseCategory, setNewExerciseCategory] = useState("Other");

  // Load from localStorage
  useEffect(() => {
    const savedExercises = localStorage.getItem("gym-exercises");
    const lastMotivation = localStorage.getItem("gym-last-motivation");

    if (savedExercises) {
      const parsed = JSON.parse(savedExercises);
      // Ensure all exercises have history array (migration)
      const migrated = parsed.map((e: Exercise) => ({
        ...e,
        history: e.history || [],
      }));
      setExercises(migrated);
    }

    // Check if we should show motivation (once per week)
    const currentWeek = getWeekNumber(new Date());
    if (!lastMotivation || parseInt(lastMotivation) !== currentWeek) {
      setMotivationalQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
      setShowMotivation(true);
      localStorage.setItem("gym-last-motivation", currentWeek.toString());
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("gym-exercises", JSON.stringify(exercises));
  }, [exercises]);

  const handleAddExercise = useCallback(() => {
    if (!newExerciseName.trim()) return;

    const icons: Record<ExerciseType, string> = {
      weighted: "🏋️",
      bodyweight: "🧘",
      timed: "⏱️",
    };

    const newExercise: Exercise = {
      id: generateId(),
      name: newExerciseName.trim(),
      type: newExerciseType,
      category: newExerciseCategory,
      icon: icons[newExerciseType],
      history: [],
    };

    setExercises((prev) => [...prev, newExercise]);
    setNewExerciseName("");
    setNewExerciseType("weighted");
    setNewExerciseCategory("Other");
    setShowExerciseModal(false);
  }, [newExerciseName, newExerciseType, newExerciseCategory]);

  const handleDeleteExercise = useCallback((exerciseId: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
  }, []);

  const handleUpdateWeight = useCallback(() => {
    if (!selectedExercise) return;

    const weight = parseFloat(formWeight) || undefined;
    const reps = parseInt(formReps) || undefined;
    const sets = parseInt(formSets) || undefined;

    const newEntry: HistoryEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      weight,
      reps,
      sets,
    };

    setExercises((prev) =>
      prev.map((e) =>
        e.id === selectedExercise.id 
          ? { 
              ...e, 
              currentWeight: weight, 
              currentReps: reps, 
              currentSets: sets,
              history: [...e.history, newEntry],
            } 
          : e
      )
    );

    setShowWeightModal(false);
    setSelectedExercise(null);
    setFormWeight("");
    setFormReps("");
    setFormSets("");
  }, [selectedExercise, formWeight, formReps, formSets]);

  const handleUpdateBodyweight = useCallback(() => {
    if (!selectedExercise) return;

    const reps = parseInt(formReps) || undefined;
    const sets = parseInt(formSets) || undefined;

    const newEntry: HistoryEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      reps,
      sets,
      assistanceBand: formBand,
    };

    setExercises((prev) =>
      prev.map((e) =>
        e.id === selectedExercise.id 
          ? { 
              ...e, 
              assistanceBand: formBand, 
              currentReps: reps, 
              currentSets: sets,
              history: [...e.history, newEntry],
            } 
          : e
      )
    );

    setShowBandModal(false);
    setSelectedExercise(null);
    setFormBand("none");
    setFormReps("");
    setFormSets("");
  }, [selectedExercise, formBand, formReps, formSets]);

  const handleUpdateDuration = useCallback(() => {
    if (!selectedExercise) return;

    const mins = parseInt(formMinutes) || 0;
    const secs = parseInt(formSeconds) || 0;
    const totalSeconds = mins * 60 + secs;

    if (totalSeconds < 0) return;

    const newEntry: HistoryEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      duration: totalSeconds,
    };

    setExercises((prev) =>
      prev.map((e) =>
        e.id === selectedExercise.id 
          ? { 
              ...e, 
              currentDuration: totalSeconds,
              history: [...e.history, newEntry],
            } 
          : e
      )
    );

    setShowTimeModal(false);
    setSelectedExercise(null);
    setFormMinutes("0");
    setFormSeconds("0");
  }, [selectedExercise, formMinutes, formSeconds]);

  const handleDeleteHistoryEntry = useCallback((exerciseId: string, entryId: string) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        
        const newHistory = e.history.filter(h => h.id !== entryId);
        const lastEntry = newHistory[newHistory.length - 1];
        
        return {
          ...e,
          history: newHistory,
          currentWeight: lastEntry?.weight ?? undefined,
          currentReps: lastEntry?.reps ?? undefined,
          currentSets: lastEntry?.sets ?? undefined,
          currentDuration: lastEntry?.duration ?? undefined,
          assistanceBand: lastEntry?.assistanceBand ?? undefined,
        };
      })
    );
  }, []);

  const openWeightModal = (exercise: Exercise) => {
    if (exercise.type !== "weighted") return;
    setSelectedExercise(exercise);
    setFormWeight(exercise.currentWeight?.toString() || "");
    setFormReps(exercise.currentReps?.toString() || "");
    setFormSets(exercise.currentSets?.toString() || "");
    setShowWeightModal(true);
  };

  const openBandModal = (exercise: Exercise) => {
    if (exercise.type !== "bodyweight") return;
    setSelectedExercise(exercise);
    setFormBand(exercise.assistanceBand || "none");
    setFormReps(exercise.currentReps?.toString() || "");
    setFormSets(exercise.currentSets?.toString() || "");
    setShowBandModal(true);
  };

  const openTimeModal = (exercise: Exercise) => {
    if (exercise.type !== "timed") return;
    setSelectedExercise(exercise);
    const duration = exercise.currentDuration || 0;
    setFormMinutes(Math.floor(duration / 60).toString());
    setFormSeconds((duration % 60).toString());
    setShowTimeModal(true);
  };

  const openHistoryModal = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowHistoryModal(true);
  };

  const openExerciseSettings = (exercise: Exercise) => {
    if (exercise.type === "weighted") {
      openWeightModal(exercise);
    } else if (exercise.type === "bodyweight") {
      openBandModal(exercise);
    } else {
      openTimeModal(exercise);
    }
  };

  // Group exercises by category
  const exercisesByCategory = exercises.reduce<Record<string, Exercise[]>>((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = [];
    }
    acc[exercise.category].push(exercise);
    return acc;
  }, {});

  const categories = Object.keys(exercisesByCategory).sort();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Motivation Modal */}
      {showMotivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-scale-in">
          <div className="relative max-w-md mx-4 p-8 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-elevated)] rounded-3xl border border-[var(--accent)]/30 animate-pulse-glow">
            <button
              onClick={() => setShowMotivation(false)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close motivation modal"
            >
              <X size={24} />
            </button>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-[var(--accent)]/20">
                <Flame className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-[var(--accent)]">Weekly Motivation</h2>
              <p className="text-lg text-[var(--foreground)] leading-relaxed">{motivationalQuote}</p>
              <button
                onClick={() => setShowMotivation(false)}
                className="mt-8 px-8 py-3 bg-[var(--accent)] text-black font-semibold rounded-full hover:bg-[var(--accent-glow)] transition-all transform hover:scale-105"
              >
                Let&apos;s Crush It! 💪
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] animate-scale-in max-h-[80vh] flex flex-col">
            <button
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedExercise(null);
              }}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close history modal"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{selectedExercise.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{selectedExercise.name}</h2>
                <p className="text-sm text-[var(--muted)]">Progress History</p>
              </div>
            </div>

            {/* PR Badge */}
            {selectedExercise.history.length > 0 && (
              <div className="mb-4 p-3 bg-[var(--accent)]/10 rounded-xl border border-[var(--accent)]/30 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-[var(--accent)]" />
                <div>
                  <p className="text-xs text-[var(--muted)]">Personal Record</p>
                  <p className="font-bold text-[var(--accent)]">
                    {selectedExercise.type === "weighted" && (
                      <>{getPR(selectedExercise.history, "weighted")?.weight || 0} kg</>
                    )}
                    {selectedExercise.type === "bodyweight" && (
                      <>{getPR(selectedExercise.history, "bodyweight")?.reps || 0} reps</>
                    )}
                    {selectedExercise.type === "timed" && (
                      <>{formatDuration(getPR(selectedExercise.history, "timed")?.duration || 0)}</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* History List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {selectedExercise.history.length === 0 ? (
                <div className="text-center py-8 text-[var(--muted)]">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No history yet</p>
                  <p className="text-sm">Start tracking to see your progress!</p>
                </div>
              ) : (
                [...selectedExercise.history].reverse().map((entry, index, arr) => {
                  const prevEntry = arr[index + 1] || null;
                  const progress = getProgressFromPrevious(entry, prevEntry, selectedExercise.type);
                  const isPR = isNewPR(entry, selectedExercise.history, selectedExercise.type);
                  
                  return (
                    <div
                      key={entry.id}
                      className="group p-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border)] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {progress === "up" && (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        {progress === "down" && (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        {progress === "same" && (
                          <div className="w-4 h-4 rounded-full bg-[var(--muted)]/30" />
                        )}
                        {progress === null && (
                          <div className="w-4 h-4" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {selectedExercise.type === "weighted" && (
                                <>{entry.weight} kg</>
                              )}
                              {selectedExercise.type === "bodyweight" && (
                                <>{entry.reps} reps</>
                              )}
                              {selectedExercise.type === "timed" && (
                                <>{formatDuration(entry.duration || 0)}</>
                              )}
                            </p>
                            {isPR && (
                              <span className="px-1.5 py-0.5 text-xs font-bold bg-[var(--accent)] text-black rounded">
                                PR
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            {formatFullDate(entry.date)}
                            {selectedExercise.type === "weighted" && entry.reps && entry.sets && (
                              <> • {entry.reps}×{entry.sets}</>
                            )}
                            {selectedExercise.type === "bodyweight" && entry.sets && (
                              <> • {entry.sets} sets</>
                            )}
                            {selectedExercise.type === "bodyweight" && entry.assistanceBand && entry.assistanceBand !== "none" && (
                              <> • {BAND_LABELS[entry.assistanceBand]}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteHistoryEntry(selectedExercise.id, entry.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--danger)] transition-all"
                        aria-label="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New Entry Button */}
            <button
              onClick={() => {
                setShowHistoryModal(false);
                openExerciseSettings(selectedExercise);
              }}
              className="mt-4 w-full py-3 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent-glow)] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add New Entry
            </button>
          </div>
        </div>
      )}

      {/* Update Band Modal */}
      {showBandModal && selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] animate-scale-in">
            <button
              onClick={() => {
                setShowBandModal(false);
                setSelectedExercise(null);
                setFormBand("none");
                setFormReps("");
                setFormSets("");
              }}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close band modal"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{selectedExercise.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{selectedExercise.name}</h2>
                <p className="text-sm text-[var(--muted)]">{selectedExercise.category}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Reps
                  </label>
                  <input
                    type="number"
                    value={formReps}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormReps(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors text-xl font-bold text-center"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Sets
                  </label>
                  <input
                    type="number"
                    value={formSets}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormSets(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors text-xl font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Assistance Band
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(BAND_LABELS) as AssistanceBand[]).map((band) => (
                    <button
                      key={band}
                      type="button"
                      onClick={() => setFormBand(band)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        formBand === band
                          ? "bg-[var(--accent)] text-black"
                          : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)]"
                      }`}
                    >
                      {BAND_LABELS[band]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleUpdateBodyweight}
                className="w-full py-4 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent-glow)] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Time Modal */}
      {showTimeModal && selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] animate-scale-in">
            <button
              onClick={() => {
                setShowTimeModal(false);
                setSelectedExercise(null);
                setFormMinutes("0");
                setFormSeconds("0");
              }}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close time modal"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{selectedExercise.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{selectedExercise.name}</h2>
                <p className="text-sm text-[var(--muted)]">{selectedExercise.category}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Time
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      value={formMinutes}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormMinutes(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors text-2xl font-bold text-center"
                    />
                    <p className="text-xs text-[var(--muted)] text-center mt-1">minutes</p>
                  </div>
                  <span className="text-2xl font-bold text-[var(--muted)]">:</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formSeconds}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormSeconds(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors text-2xl font-bold text-center"
                    />
                    <p className="text-xs text-[var(--muted)] text-center mt-1">seconds</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpdateDuration}
                className="w-full py-4 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent-glow)] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Weight Modal */}
      {showWeightModal && selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] animate-scale-in">
            <button
              onClick={() => {
                setShowWeightModal(false);
                setSelectedExercise(null);
                setFormWeight("");
                setFormReps("");
                setFormSets("");
              }}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close weight modal"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{selectedExercise.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{selectedExercise.name}</h2>
                <p className="text-sm text-[var(--muted)]">{selectedExercise.category}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={formWeight}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormWeight(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors text-2xl font-bold text-center"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Reps
                  </label>
                  <input
                    type="number"
                    value={formReps}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormReps(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors text-xl font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Sets
                  </label>
                  <input
                    type="number"
                    value={formSets}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormSets(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors text-xl font-bold text-center"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdateWeight}
                className="w-full py-4 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent-glow)] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] animate-scale-in">
            <button
              onClick={() => setShowExerciseModal(false)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close add exercise modal"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-6">Add New Exercise</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExerciseName(e.target.value)}
                  placeholder="e.g., Cable Flies"
                  className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Exercise Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setNewExerciseType("weighted")}
                    className={`px-3 py-3 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                      newExerciseType === "weighted"
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    <Dumbbell size={18} />
                    <span className="text-xs">Weighted</span>
                  </button>
                  <button
                    onClick={() => setNewExerciseType("bodyweight")}
                    className={`px-3 py-3 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                      newExerciseType === "bodyweight"
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    <Target size={18} />
                    <span className="text-xs">Bodyweight</span>
                  </button>
                  <button
                    onClick={() => setNewExerciseType("timed")}
                    className={`px-3 py-3 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                      newExerciseType === "timed"
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    <Timer size={18} />
                    <span className="text-xs">Timed</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newExerciseCategory}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExerciseCategory(e.target.value)}
                  placeholder="e.g., Chest, Back, Legs"
                  className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <button
                onClick={handleAddExercise}
                disabled={!newExerciseName.trim()}
                className="w-full py-4 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent-glow)] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Exercise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">LIFT</h1>
              <p className="text-xs text-[var(--muted)]">Track your progress</p>
            </div>
          </div>
          <button
            onClick={() => {
              setMotivationalQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
              setShowMotivation(true);
            }}
            className="p-2 rounded-full hover:bg-[var(--surface)] transition-colors"
            aria-label="Show motivation"
          >
            <Flame className="w-5 h-5 text-[var(--warning)]" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Exercises by Category */}
        {categories.map((category, catIndex) => (
          <section key={category} className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-[var(--muted)]">{category}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {exercisesByCategory[category].map((exercise, index) => {
                const pr = getPR(exercise.history, exercise.type);
                const hasHistory = exercise.history.length > 0;
                
                return (
                  <div
                    key={exercise.id}
                    className="group relative p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all hover:scale-[1.02] text-left animate-slide-up cursor-pointer"
                    style={{ animationDelay: `${(catIndex * 4 + index) * 50}ms` }}
                    onClick={() => openExerciseSettings(exercise)}
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleDeleteExercise(exercise.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-all"
                      aria-label={`Delete ${exercise.name}`}
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* History Button */}
                    {hasHistory && (
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          openHistoryModal(exercise);
                        }}
                        className="absolute top-2 right-9 p-1.5 opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-all"
                        aria-label={`View history for ${exercise.name}`}
                      >
                        <History size={14} />
                      </button>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{exercise.icon}</span>
                      {pr && (
                        <span className="flex items-center gap-1 text-xs text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                          <Trophy size={10} />
                          {exercise.type === "weighted" && `${pr.weight}kg`}
                          {exercise.type === "bodyweight" && `${pr.reps}`}
                          {exercise.type === "timed" && formatDuration(pr.duration || 0)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm mb-1">{exercise.name}</h3>
                    {exercise.type === "weighted" && (
                      <div>
                        <p className="text-lg font-bold text-[var(--accent)]">
                          {exercise.currentWeight ? `${exercise.currentWeight} kg` : "—"}
                        </p>
                        {(exercise.currentReps || exercise.currentSets) && (
                          <p className="text-xs text-[var(--muted)]">
                            {exercise.currentReps || 0} reps × {exercise.currentSets || 0} sets
                          </p>
                        )}
                      </div>
                    )}
                    {exercise.type === "bodyweight" && (
                      <div>
                        {(exercise.currentReps || exercise.currentSets) ? (
                          <>
                            <p className="text-lg font-bold text-[var(--accent)]">
                              {exercise.currentReps || 0} reps × {exercise.currentSets || 0}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {BAND_LABELS[exercise.assistanceBand || "none"]}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-medium text-[var(--accent)]">
                            {BAND_LABELS[exercise.assistanceBand || "none"]}
                          </p>
                        )}
                      </div>
                    )}
                    {exercise.type === "timed" && (
                      <p className="text-xl font-bold text-[var(--accent)]">
                        {exercise.currentDuration ? formatDuration(exercise.currentDuration) : "—"}
                      </p>
                    )}
                    {hasHistory && (
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {exercise.history.length} {exercise.history.length === 1 ? "entry" : "entries"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {exercises.length === 0 && (
          <div className="text-center py-16 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-[var(--muted)]" />
            <p className="text-[var(--muted)] mb-2">No exercises yet</p>
            <p className="text-sm text-[var(--muted)]">Add your first exercise to get started!</p>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setShowExerciseModal(true)}
          className="px-6 py-4 bg-[var(--accent)] text-black font-bold rounded-full shadow-lg shadow-[var(--accent)]/30 hover:bg-[var(--accent-glow)] transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <Plus size={20} />
          Add Exercise
        </button>
      </div>
    </div>
  );
}
