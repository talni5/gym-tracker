"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dumbbell,
  Plus,
  TrendingUp,
  Flame,
  Trophy,
  ChevronRight,
  X,
  Target,
  Zap,
  Calendar,
  BarChart3,
  Trash2,
  Edit3,
  Check,
  Star,
  Medal,
} from "lucide-react";

type ExerciseType = "weighted" | "bodyweight";
type AssistanceBand = "none" | "heavy" | "medium" | "light";

interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  category: string;
  icon: string;
}

interface WorkoutEntry {
  id: string;
  exerciseId: string;
  date: string;
  weight?: number;
  reps: number;
  sets: number;
  assistanceBand?: AssistanceBand;
  notes?: string;
}

const PRESET_EXERCISES: Exercise[] = [
  { id: "squat", name: "Squat", type: "weighted", category: "Legs", icon: "🦵" },
  { id: "deadlift", name: "Deadlift", type: "weighted", category: "Back", icon: "💪" },
  { id: "bench", name: "Bench Press", type: "weighted", category: "Chest", icon: "🏋️" },
  { id: "ohp", name: "Overhead Press", type: "weighted", category: "Shoulders", icon: "🙌" },
  { id: "row", name: "Barbell Row", type: "weighted", category: "Back", icon: "🚣" },
  { id: "curl", name: "Bicep Curl", type: "weighted", category: "Arms", icon: "💪" },
  { id: "tricep", name: "Tricep Extension", type: "weighted", category: "Arms", icon: "🔱" },
  { id: "pullup", name: "Pull-up", type: "bodyweight", category: "Back", icon: "🧗" },
  { id: "pushup", name: "Push-up", type: "bodyweight", category: "Chest", icon: "🫸" },
  { id: "dip", name: "Dip", type: "bodyweight", category: "Chest", icon: "⬇️" },
  { id: "plank", name: "Plank", type: "bodyweight", category: "Core", icon: "🧘" },
  { id: "lunge", name: "Lunges", type: "bodyweight", category: "Legs", icon: "🚶" },
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

const BAND_LABELS: Record<AssistanceBand, string> = {
  none: "No Band",
  heavy: "Heavy Band",
  medium: "Medium Band",
  light: "Light Band",
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysSinceLastWorkout(entries: WorkoutEntry[], exerciseId: string): number | null {
  const exerciseEntries = entries
    .filter((e) => e.exerciseId === exerciseId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (exerciseEntries.length === 0) return null;

  const lastDate = new Date(exerciseEntries[0].date);
  const today = new Date();
  const diffTime = today.getTime() - lastDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getProgressData(entries: WorkoutEntry[], exerciseId: string): { current: number; previous: number; percentChange: number } | null {
  const exerciseEntries = entries
    .filter((e) => e.exerciseId === exerciseId && e.weight !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (exerciseEntries.length < 2) return null;

  const current = exerciseEntries[0].weight!;
  const previous = exerciseEntries[exerciseEntries.length - 1].weight!;
  const percentChange = previous === 0 ? 0 : ((current - previous) / previous) * 100;

  return { current, previous, percentChange };
}

export default function GymTracker() {
  const [exercises, setExercises] = useState<Exercise[]>(PRESET_EXERCISES);
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [currentView, setCurrentView] = useState<"dashboard" | "history" | "add">("dashboard");
  const [motivationalQuote, setMotivationalQuote] = useState("");
  const [showMotivation, setShowMotivation] = useState(false);

  // Form state
  const [formWeight, setFormWeight] = useState<string>("");
  const [formReps, setFormReps] = useState<string>("10");
  const [formSets, setFormSets] = useState<string>("3");
  const [formBand, setFormBand] = useState<AssistanceBand>("none");
  const [formNotes, setFormNotes] = useState<string>("");

  // Custom exercise form
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>("weighted");
  const [newExerciseCategory, setNewExerciseCategory] = useState("Other");

  // Load from localStorage
  useEffect(() => {
    const savedExercises = localStorage.getItem("gym-exercises");
    const savedEntries = localStorage.getItem("gym-entries");
    const lastMotivation = localStorage.getItem("gym-last-motivation");

    if (savedExercises) {
      setExercises(JSON.parse(savedExercises));
    }
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
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

  useEffect(() => {
    localStorage.setItem("gym-entries", JSON.stringify(entries));
  }, [entries]);

  const handleAddEntry = useCallback(() => {
    if (!selectedExercise) return;

    const newEntry: WorkoutEntry = {
      id: generateId(),
      exerciseId: selectedExercise.id,
      date: new Date().toISOString(),
      weight: selectedExercise.type === "weighted" ? parseFloat(formWeight) || undefined : undefined,
      reps: parseInt(formReps) || 10,
      sets: parseInt(formSets) || 3,
      assistanceBand: selectedExercise.type === "bodyweight" ? formBand : undefined,
      notes: formNotes || undefined,
    };

    setEntries((prev) => [...prev, newEntry]);
    resetForm();
    setShowAddModal(false);
    setSelectedExercise(null);
  }, [selectedExercise, formWeight, formReps, formSets, formBand, formNotes]);

  const handleAddExercise = useCallback(() => {
    if (!newExerciseName.trim()) return;

    const newExercise: Exercise = {
      id: generateId(),
      name: newExerciseName.trim(),
      type: newExerciseType,
      category: newExerciseCategory,
      icon: newExerciseType === "weighted" ? "🏋️" : "🧘",
    };

    setExercises((prev) => [...prev, newExercise]);
    setNewExerciseName("");
    setNewExerciseType("weighted");
    setNewExerciseCategory("Other");
    setShowExerciseModal(false);
  }, [newExerciseName, newExerciseType, newExerciseCategory]);

  const handleDeleteEntry = useCallback((entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  const resetForm = () => {
    setFormWeight("");
    setFormReps("10");
    setFormSets("3");
    setFormBand("none");
    setFormNotes("");
  };

  const openAddWorkout = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    resetForm();
    setShowAddModal(true);
  };

  const getExerciseById = (id: string): Exercise | undefined => {
    return exercises.find((e) => e.id === id);
  };

  const recentEntries = entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const totalWorkouts = entries.length;
  const uniqueExercises = new Set(entries.map((e) => e.exerciseId)).size;
  const totalWeight = entries.reduce((sum, e) => sum + (e.weight || 0) * e.reps * e.sets, 0);

  const needsWeightIncrease = exercises.filter((ex) => {
    const days = getDaysSinceLastWorkout(entries, ex.id);
    return days !== null && days >= 7;
  });

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

      {/* Add Workout Modal */}
      {showAddModal && selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 p-6 bg-[var(--surface)] rounded-2xl border border-[var(--border)] animate-scale-in">
            <button
              onClick={() => {
                setShowAddModal(false);
                setSelectedExercise(null);
              }}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close add workout modal"
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
              {selectedExercise.type === "weighted" && (
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={formWeight}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormWeight(e.target.value)}
                    placeholder="Enter weight"
                    className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              )}

              {selectedExercise.type === "bodyweight" && (
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Assistance Band
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(BAND_LABELS) as AssistanceBand[]).map((band) => (
                      <button
                        key={band}
                        onClick={() => setFormBand(band)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Reps
                  </label>
                  <input
                    type="number"
                    value={formReps}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormReps(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
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
                    className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormNotes(e.target.value)}
                  placeholder="How did it feel?"
                  rows={2}
                  className="w-full px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                />
              </div>

              <button
                onClick={handleAddEntry}
                className="w-full py-4 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent-glow)] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Log Workout
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
            <h2 className="text-xl font-bold mb-6">Add Custom Exercise</h2>

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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewExerciseType("weighted")}
                    className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      newExerciseType === "weighted"
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    <Dumbbell size={18} />
                    Weighted
                  </button>
                  <button
                    onClick={() => setNewExerciseType("bodyweight")}
                    className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      newExerciseType === "bodyweight"
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    <Target size={18} />
                    Bodyweight
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
              <p className="text-xs text-[var(--muted)]">Track your gains</p>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[var(--warning)]" />
              <span className="text-xs text-[var(--muted)]">Workouts</span>
            </div>
            <p className="text-2xl font-bold">{totalWorkouts}</p>
          </div>
          <div className="p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs text-[var(--muted)]">Exercises</span>
            </div>
            <p className="text-2xl font-bold">{uniqueExercises}</p>
          </div>
          <div className="p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[var(--danger)]" />
              <span className="text-xs text-[var(--muted)]">Total kg</span>
            </div>
            <p className="text-2xl font-bold">{totalWeight.toLocaleString()}</p>
          </div>
        </div>

        {/* Weight Increase Suggestions */}
        {needsWeightIncrease.length > 0 && (
          <div className="mb-8 p-4 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent)]/5 rounded-2xl border border-[var(--accent)]/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="font-semibold text-[var(--accent)]">Time to Level Up! 🚀</h2>
            </div>
            <p className="text-sm text-[var(--muted)] mb-3">
              It&apos;s been a week! Consider increasing weights for:
            </p>
            <div className="flex flex-wrap gap-2">
              {needsWeightIncrease.slice(0, 5).map((ex) => (
                <span
                  key={ex.id}
                  className="px-3 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-sm font-medium"
                >
                  {ex.icon} {ex.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Selection */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Log Workout</h2>
            <button
              onClick={() => setShowExerciseModal(true)}
              className="flex items-center gap-1 text-sm text-[var(--accent)] hover:text-[var(--accent-glow)] transition-colors"
            >
              <Plus size={16} />
              Add Exercise
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {exercises.map((exercise, index) => {
              const progress = getProgressData(entries, exercise.id);
              const daysSince = getDaysSinceLastWorkout(entries, exercise.id);

              return (
                <button
                  key={exercise.id}
                  onClick={() => openAddWorkout(exercise)}
                  className="group p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all hover:scale-[1.02] text-left animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{exercise.icon}</span>
                    {progress && progress.percentChange > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-[var(--accent)]">
                        <TrendingUp size={12} />
                        {progress.percentChange.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-sm mb-1">{exercise.name}</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {exercise.type === "weighted" ? (
                      progress ? `${progress.current}kg` : "No data"
                    ) : (
                      exercise.category
                    )}
                  </p>
                  {daysSince !== null && daysSince >= 7 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[var(--warning)]">
                      <Star size={10} />
                      {daysSince}d ago
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Recent History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
              <Calendar size={14} />
              Last 10
            </div>
          </div>
          {recentEntries.length === 0 ? (
            <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[var(--muted)]" />
              <p className="text-[var(--muted)] mb-2">No workouts yet</p>
              <p className="text-sm text-[var(--muted)]">Start by logging your first exercise!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry, index) => {
                const exercise = getExerciseById(entry.exerciseId);
                if (!exercise) return null;

                return (
                  <div
                    key={entry.id}
                    className="group p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] flex items-center justify-between animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{exercise.icon}</span>
                      <div>
                        <h3 className="font-medium text-sm">{exercise.name}</h3>
                        <p className="text-xs text-[var(--muted)]">
                          {formatDate(entry.date)} • {entry.sets}x{entry.reps}
                          {entry.weight && ` @ ${entry.weight}kg`}
                          {entry.assistanceBand && entry.assistanceBand !== "none" && (
                            <span className="ml-1">({BAND_LABELS[entry.assistanceBand]})</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-2 opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--danger)] transition-all"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setShowExerciseModal(true)}
          className="px-6 py-4 bg-[var(--accent)] text-black font-bold rounded-full shadow-lg shadow-[var(--accent)]/30 hover:bg-[var(--accent-glow)] transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <Plus size={20} />
          Log Workout
        </button>
      </div>
    </div>
  );
}
