import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Dumbbell,
  Swords,
  FlaskConical,
  Feather,
  User,
  Skull,
  Dog,
  Flame,
  Ghost,
} from "lucide-react";

// ------------------------------------
// Utils
// ------------------------------------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

const DEFAULT_HERO = {
  hp: 20,
  str: 2,
  dex: 2,
  int: 2,
  possession: 0,
};

// ------------------------------------
// Story passages
// ------------------------------------
const STORY = {
  start: "prologue",
  passages: {
    prologue: {
      title: "La trahison et le corbeau",
      text: "Sous les remparts, la pluie bat ton plastron. Haragoth, le Corbeau-Cendre, murmure à ton oreille. La trahison de ton amour a fendu ton âme : la cendre s’infiltre...",
      choices: [
        { text: "Résister et partir", to: "lisiere", set: { path: "light" } },
        {
          text: "Écouter le corbeau",
          to: "lisiere",
          set: { path: "crow" },
          setDelta: { possession: 1 },
        },
      ],
    },
    lisiere: {
      title: "Lisière des Murmures",
      text: "La canopée avale le jour. Des yeux veillent entre les troncs.",
      choices: [
        { text: "Prendre le sentier étroit", to: "bandit" },
        { text: "S’enfoncer dans l’ombre", to: "loups" },
      ],
    },
    bandit: {
      title: "Embuscade",
      text: "Un bandit jaillit du taillis, lame rouillée.",
      combat: {
        enemy: { name: "Bandit", icon: Skull, hp: 8, force: 3 },
        onVictory: { to: "apres_bandit" },
        onDefeat: { to: "mort" },
      },
    },
    apres_bandit: {
      title: "Butin du bandit",
      text: "Tu fouilles son cadavre. Peut-être trouveras-tu de quoi survivre...",
      choices: [{ text: "Avancer vers la forêt", to: "loups" }],
    },
    loups: {
      title: "La meute grise",
      text: "Des crocs brillent dans la nuit, encerclant ta route.",
      combat: {
        enemy: { name: "Loup affamé", icon: Dog, hp: 7, force: 4 },
        onVictory: { to: "apres_loup" },
        onDefeat: { to: "mort" },
      },
    },
    apres_loup: {
      title: "La clairière",
      text: "Le silence retombe. Une clairière s’ouvre, baignée par la lune.",
      choices: [
        { text: "Allumer un feu et te reposer", to: "repos" },
        { text: "Approcher de l’ermite", to: "ermite" },
        { text: "Chercher un autel ancien", to: "autel" },
      ],
    },
    repos: {
      title: "Repos au feu",
      text: "La chaleur du feu apaise tes plaies.",
      choices: [{ text: "Reprendre la route", to: "ermite", setDelta: { hp: 4 } }],
    },
    ermite: {
      title: "L’ermite des runes",
      text: "Un vieil homme t’observe. « Je peux souffler une étincelle claire... mais chaque lumière a un prix. »",
      choices: [
        { text: "Accepter la bénédiction", to: "ruines", setDelta: { hp: 5, possession: -1 } },
        { text: "Demander une force sombre", to: "ruines", setDelta: { str: 2, possession: 2 } },
        { text: "Refuser et partir", to: "ruines" },
      ],
    },
    autel: {
      title: "Autel voilé",
      text: "Une dalle gravée murmure. Trois signes dispersés... les réunir serait rompre des chaînes anciennes.",
      choices: [
        { text: "Jurer de chercher les trois signes", to: "ruines", set: { quete_signes: true } },
        { text: "Ignorer l’autel", to: "ruines" },
      ],
    },
    ruines: {
      title: "Les Ruines",
      text: "Des pierres effondrées... et une goule surgit dans l’ombre.",
      combat: {
        enemy: { name: "Goule", icon: Ghost, hp: 10, force: 5 },
        onVictory: { to: "dragon" },
        onDefeat: { to: "mort" },
      },
    },
    dragon: {
      title: "Le Dragon",
      text: "Un rugissement fend la nuit. Les flammes s’élèvent... c’est l’épreuve ultime.",
      combat: {
        enemy: { name: "Dragon", icon: Flame, hp: 20, force: 7 },
        onVictory: { to: "fin" },
        onDefeat: { to: "mort" },
      },
    },
    mort: {
      title: "Mort prématurée",
      text: "Tes pas s’arrêtent ici. La nuit t’engloutit.",
      choices: [{ text: "Recommencer", to: "prologue" }],
    },
    fin: {
      title: "Destin",
      text: "Au seuil de la victoire, ton âme révèle son choix final...",
      choices: [
        { text: "Fin héroïque (possession basse)", to: "fin_bonne" },
        { text: "Fin corrompue (possession haute)", to: "fin_mauvaise" },
        { text: "Fin cachée (si quête accomplie)", to: "fin_cachee", if: { quete_signes: true } },
      ],
    },
    fin_bonne: {
      title: "Lumière",
      text: "Tu as résisté aux ténèbres. La lumière demeure en toi.",
      choices: [{ text: "Recommencer", to: "prologue" }],
    },
    fin_mauvaise: {
      title: "Corruption",
      text: "Haragoth t’engloutit. Ton armure marche désormais sans toi.",
      choices: [{ text: "Recommencer", to: "prologue" }],
    },
    fin_cachee: {
      title: "Le secret des signes",
      text: "Les trois signes brisent les chaînes. Une vérité plus vaste s’ouvre à toi...",
      choices: [{ text: "Recommencer", to: "prologue" }],
    },
  },
};

// ------------------------------------
// Sidebar Stat Item with animation
// ------------------------------------
function StatItem({ icon: Icon, value, color }) {
  const [prev, setPrev] = useState(value);
  const [change, setChange] = useState(0);

  useEffect(() => {
    if (value !== prev) {
      setChange(value - prev);
      setPrev(value);
      const timer = setTimeout(() => setChange(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [value, prev]);

  return (
    <motion.div
      key={value}
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: [1.05, 1], opacity: [0.9, 1] }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between relative"
    >
      <Icon className={`w-5 h-5 ${color}`} />
      <motion.span className="font-bold text-lg">{value}</motion.span>
      {change !== 0 && (
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: -20 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className={`absolute right-0 text-sm font-bold ${
            change > 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {change > 0 ? `+${change}` : `${change}`}
        </motion.span>
      )}
    </motion.div>
  );
}

// ------------------------------------
// Combat UI
// ------------------------------------
function CombatView({ hero, enemy, onAttack, log, finished, result }) {
  return (
    <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl space-y-4">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <User className="w-5 h-5 text-slate-200" />
          <span className="font-semibold">Héros</span>
        </div>
        <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
          <div
            className="bg-green-600 h-3"
            style={{ width: `${(hero.hp / 20) * 100}%` }}
          ></div>
        </div>
      </div>
      {/* Enemy */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {enemy.icon && <enemy.icon className="w-5 h-5 text-red-400" />}
          <span className="font-semibold">{enemy.name}</span>
        </div>
        <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
          <div
            className="bg-red-600 h-3"
            style={{ width: `${(enemy.hpCurrent / enemy.hp) * 100}%` }}
          ></div>
        </div>
      </div>
      {/* Attack Button */}
      {!finished && (
        <button
          onClick={onAttack}
          className="w-full py-3 rounded-xl bg-red-700 hover:bg-red-600 font-bold"
        >
          Attaquer
        </button>
      )}
      {/* Result */}
      {finished && (
        <div
          className={`text-center font-bold text-xl ${
            result === "victory" ? "text-green-400" : "text-red-400"
          }`}
        >
          {result === "victory" ? "Victoire !" : "Défaite..."}
        </div>
      )}
      {/* Log */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {log.map((line, i) => (
          <div key={i} className="bg-slate-900/60 p-2 rounded-lg text-sm">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------
// App
// ------------------------------------
export default function App() {
  const [story] = useState(STORY);
  const [state, setState] = useState(() => ({
    node: story.start,
    vars: { ...DEFAULT_HERO },
    history: [story.start],
  }));
  const current = story.passages[state.node];

  const [combatState, setCombatState] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [combatResult, setCombatResult] = useState(null);

  const startCombat = (combat) => {
    setCombatState({ enemy: { ...combat.enemy, hpCurrent: combat.enemy.hp } });
    setCombatLog([]);
    setCombatResult(null);
  };

  const handleAttack = () => {
    if (!combatState) return;
    const heroRoll = rollDie(6) + state.vars.str;
    const enemyRoll = rollDie(6) + combatState.enemy.force;
    let logLine = `Héros (${heroRoll}) vs ${combatState.enemy.name} (${enemyRoll})`;
    if (heroRoll >= enemyRoll) {
      combatState.enemy.hpCurrent = clamp(
        combatState.enemy.hpCurrent - 3,
        0,
        combatState.enemy.hp
      );
      logLine += " → Coup porté !";
    } else {
      state.vars.hp = clamp(state.vars.hp - 3, 0, 20);
      logLine += " → Blessure subie !";
    }
    setCombatLog((prev) => [...prev, logLine]);
    setCombatState({ ...combatState });
    if (combatState.enemy.hpCurrent <= 0) {
      setCombatResult("victory");
      setState({ ...state, node: current.combat.onVictory.to });
      setCombatState(null);
    } else if (state.vars.hp <= 0) {
      setCombatResult("defeat");
      setState({ ...state, node: current.combat.onDefeat.to });
      setCombatState(null);
    }
  };

  const goTo = (to, set = undefined, setDelta = undefined) => {
    setState((prev) => {
      let vars = { ...prev.vars };
      if (set) Object.keys(set).forEach((k) => (vars[k] = set[k]));
      if (setDelta)
        Object.entries(setDelta).forEach(
          ([k, v]) => (vars[k] = (vars[k] ?? 0) + v)
        );
      return { ...prev, node: to, vars, history: [...prev.history, to] };
    });
    const next = story.passages[to];
    if (next && next.combat) startCombat(next.combat);
  };

  const visibleChoices = current?.choices || [];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 flex items-start justify-center p-4 relative">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.article
            key={state.node}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl border border-slate-800 overflow-hidden"
          >
            <div className="p-5 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-2">
                {current?.title ?? "?"}
              </h2>
              <p className="leading-relaxed text-slate-200 whitespace-pre-wrap">
                {current?.text ?? "…"}
              </p>
            </div>
            <div className="border-t border-slate-800 p-3 md:p-4 grid gap-2">
              {combatState ? (
                <CombatView
                  hero={state.vars}
                  enemy={combatState.enemy}
                  onAttack={handleAttack}
                  log={combatLog}
                  finished={!!combatResult}
                  result={combatResult}
                />
              ) : (
                visibleChoices.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(c.to, c.set, c.setDelta)}
                    className="text-left px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700"
                  >
                    {c.text}
                  </button>
                ))
              )}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
      {/* Sidebar */}
      <aside className="fixed top-24 right-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-lg p-4 flex flex-col gap-3 w-40">
        <StatItem icon={Heart} value={state.vars.hp} color="text-red-500" />
        <StatItem icon={Dumbbell} value={state.vars.str} color="text-amber-500" />
        <StatItem icon={Swords} value={state.vars.dex} color="text-slate-300" />
        <StatItem icon={FlaskConical} value={state.vars.int} color="text-blue-400" />
        <StatItem icon={Feather} value={state.vars.possession} color="text-purple-400" />
      </aside>
    </div>
  );
}
