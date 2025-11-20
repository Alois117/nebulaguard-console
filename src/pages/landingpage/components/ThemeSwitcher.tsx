import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMoon, FiSun, FiZap, FiGrid } from "react-icons/fi";

type Theme = "dark" | "cyberpunk" | "matrix" | "neon";

const themes = [
  { id: "dark" as Theme, name: "Dark", icon: FiMoon },
  { id: "cyberpunk" as Theme, name: "Cyberpunk", icon: FiZap },
  { id: "matrix" as Theme, name: "Matrix", icon: FiGrid },
  { id: "neon" as Theme, name: "Neon Night", icon: FiSun },
];

const ThemeSwitcher = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>("dark");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nebula-theme") as Theme;
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove("theme-dark", "theme-cyberpunk", "theme-matrix", "theme-neon");
    
    // Add selected theme class
    root.classList.add(`theme-${theme}`);
    
    // Apply theme-specific CSS variables
    switch (theme) {
      case "cyberpunk":
        root.style.setProperty("--primary", "185 100% 50%"); // Cyan
        root.style.setProperty("--secondary", "290 100% 50%"); // Purple
        root.style.setProperty("--accent", "340 100% 58%"); // Hot Pink
        root.style.setProperty("--background", "229 58% 8%");
        break;
      case "matrix":
        root.style.setProperty("--primary", "152 100% 50%"); // Green
        root.style.setProperty("--secondary", "152 80% 40%"); // Dark Green
        root.style.setProperty("--accent", "152 100% 60%"); // Light Green
        root.style.setProperty("--background", "120 10% 5%");
        break;
      case "neon":
        root.style.setProperty("--primary", "280 100% 50%"); // Purple
        root.style.setProperty("--secondary", "340 100% 50%"); // Pink
        root.style.setProperty("--accent", "185 100% 50%"); // Cyan
        root.style.setProperty("--background", "270 20% 10%");
        break;
      default: // dark
        root.style.setProperty("--primary", "185 100% 50%");
        root.style.setProperty("--secondary", "257 76% 69%");
        root.style.setProperty("--accent", "340 100% 58%");
        root.style.setProperty("--background", "229 58% 10%");
    }
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem("nebula-theme", theme);
    setIsOpen(false);
  };

  const CurrentIcon = themes.find((t) => t.id === currentTheme)?.icon || FiMoon;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg glass-surface border border-border/30 hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
      >
        <CurrentIcon className="w-5 h-5 text-primary" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute right-0 mt-2 w-48 glass-surface rounded-xl border-2 border-primary/30 p-2 shadow-[0_0_30px_rgba(0,240,255,0.2)]"
          >
            {themes.map((theme, i) => {
              const Icon = theme.icon;
              return (
                <motion.button
                  key={theme.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentTheme === theme.id
                      ? "bg-primary/20 text-primary border border-primary/50"
                      : "hover:bg-surface/50 text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <motion.div
                      layoutId="activeTheme"
                      className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse-glow"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
