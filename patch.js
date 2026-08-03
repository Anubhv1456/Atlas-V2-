const fs = require('fs');
const file = './artifacts/study-tracker/src/components/PullToRefresh.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  '  const containerRef = useRef<HTMLDivElement>(null);\n  const THRESHOLD = 100;\n  \n  const handleTouchStart = (e: React.TouchEvent) => {\n    if (window.scrollY > 5) return;\n    setStartY(e.touches[0].clientY);\n    setPulling(true);\n  };',
  '  const containerRef = useRef<HTMLDivElement>(null);\n  const currentY = useRef(0);\n  const THRESHOLD = 100;\n  \n  const handleTouchStart = (e: React.TouchEvent) => {\n    if (window.scrollY > 5) return;\n    setStartY(e.touches[0].clientY);\n    setPulling(true);\n    currentY.current = 0;\n  };'
);

content = content.replace(
  '    if (dy > 0 && window.scrollY <= 5) {\n      const visualPull = Math.min(dy * 0.4, THRESHOLD + 20);\n      controls.set({ y: visualPull });\n    } else if (dy < 0) {\n      setPulling(false);\n      controls.set({ y: 0 });\n    }',
  '    if (dy > 0 && window.scrollY <= 5) {\n      const visualPull = Math.min(dy * 0.4, THRESHOLD + 20);\n      currentY.current = visualPull;\n      controls.set({ y: visualPull });\n    } else if (dy < 0) {\n      setPulling(false);\n      currentY.current = 0;\n      controls.set({ y: 0 });\n    }'
);

content = content.replace(
  '  const handleTouchEnd = async () => {\n    if (!pulling || refreshing) return;\n    setPulling(false);\n    \n    const currentY = (controls.get("y") as number) || 0;\n    \n    if (currentY >= THRESHOLD) {\n      setRefreshing(true);\n      controls.start({ y: 60 });\n      try {\n        await onRefresh();\n      } finally {\n        controls.start({ y: 0 });\n        setRefreshing(false);\n      }\n    } else {\n      controls.start({ y: 0 });\n    }\n  };',
  '  const handleTouchEnd = async () => {\n    if (!pulling || refreshing) return;\n    setPulling(false);\n    \n    if (currentY.current >= THRESHOLD) {\n      setRefreshing(true);\n      controls.start({ y: 60 });\n      try {\n        await onRefresh();\n      } finally {\n        controls.start({ y: 0 });\n        setRefreshing(false);\n        currentY.current = 0;\n      }\n    } else {\n      controls.start({ y: 0 });\n      currentY.current = 0;\n    }\n  };'
);

fs.writeFileSync(file, content);
