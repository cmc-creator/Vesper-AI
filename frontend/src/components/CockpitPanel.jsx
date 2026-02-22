import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, Slider, Switch, Tooltip, LinearProgress, Chip } from '@mui/material';

// ─── Utility: Random data generators ────────────────────────────────────────
const randHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
const randByte = () => Math.floor(Math.random() * 256);
const randPercent = () => Math.floor(Math.random() * 100);
const randFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);

// ─── STATUS LED ─────────────────────────────────────────────────────────────
function StatusLED({ color = '#00ff00', label, blink = false, size = 8 }) {
  return (
    <Tooltip title={label} placement="top" arrow>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{
          width: size, height: size, borderRadius: '50%',
          bgcolor: color,
          boxShadow: `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}44`,
          animation: blink ? 'ledBlink 1.2s ease-in-out infinite' : 'none',
        }} />
        {label && <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Typography>}
      </Box>
    </Tooltip>
  );
}

// ─── MINI GAUGE (circular) ──────────────────────────────────────────────────
function MiniGauge({ value = 50, label, color = 'var(--accent)', size = 44 }) {
  const angle = (value / 100) * 270 - 135;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
      <Box sx={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${color}44`,
        background: 'rgba(0,0,0,0.6)',
        position: 'relative',
        boxShadow: `inset 0 0 10px rgba(0,0,0,0.8), 0 0 8px ${color}22`,
      }}>
        {/* Tick marks */}
        {[...Array(12)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute', top: '50%', left: '50%',
            width: 1, height: i % 3 === 0 ? 5 : 3,
            bgcolor: `${color}66`,
            transformOrigin: '0 0',
            transform: `rotate(${(i / 12) * 360 - 90}deg) translateX(${size / 2 - 3}px) translateY(-50%)`,
          }} />
        ))}
        {/* Needle */}
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          width: size / 2 - 6, height: 1.5,
          bgcolor: color,
          transformOrigin: '0 50%',
          transform: `rotate(${angle}deg)`,
          boxShadow: `0 0 4px ${color}`,
          transition: 'transform 0.5s ease',
          borderRadius: 1,
        }} />
        {/* Center dot */}
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          width: 4, height: 4, borderRadius: '50%',
          bgcolor: color, transform: 'translate(-50%,-50%)',
          boxShadow: `0 0 6px ${color}`,
        }} />
      </Box>
      <Typography sx={{ fontSize: 8, color: `${color}cc`, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
    </Box>
  );
}

// ─── SCROLLING DATA STREAM ──────────────────────────────────────────────────
function DataStream({ color = 'var(--accent)', speed = 30, lines = 8 }) {
  const [data, setData] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const genLine = () => {
      const types = [
        () => `0x${randHex()}${randHex()}${randHex()}${randHex()} :: ${['ACK', 'SYN', 'FIN', 'RST', 'PSH'][Math.floor(Math.random() * 5)]}`,
        () => `[${String(randByte()).padStart(3, '0')}.${String(randByte()).padStart(3, '0')}.${String(randByte()).padStart(3, '0')}] PING ${randFloat(0.1, 45)}ms`,
        () => `MEM ${randHex()}${randHex()} → BUF.${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]} WRITE OK`,
        () => `THR-${Math.floor(Math.random() * 16).toString(16).toUpperCase()} EXEC ${randPercent()}% │ ΔT=${randFloat(0, 2)}s`,
        () => `SIG ${['NOMINAL', 'STRONG', 'WEAK', 'LOCKED'][Math.floor(Math.random() * 4)]} dBm=${randFloat(-80, -20)}`,
        () => `PWR RAIL ${['3V3', '5V0', '12V', 'VCC'][Math.floor(Math.random() * 4)]} = ${randFloat(2.8, 12.2)}V ✓`,
        () => `IO.${Math.floor(Math.random() * 32)} ${['HIGH', 'LOW', 'TRI-Z', 'PULL-UP'][Math.floor(Math.random() * 4)]} @ ${randFloat(0, 100)}kHz`,
      ];
      return types[Math.floor(Math.random() * types.length)]();
    };

    setData(Array.from({ length: lines }, genLine));
    const interval = setInterval(() => {
      setData(prev => [...prev.slice(1), genLine()]);
    }, speed * 50);
    return () => clearInterval(interval);
  }, [lines, speed]);

  return (
    <Box ref={containerRef} sx={{
      fontFamily: '"Fira Code", "Courier New", monospace',
      fontSize: 9, lineHeight: 1.5,
      color: color,
      background: 'var(--panel-bg)',
      borderRadius: 1, p: 0.8,
      border: `1px solid ${color}22`,
      overflow: 'hidden',
      height: lines * 14,
      '& > div': { whiteSpace: 'nowrap', opacity: 0.7 },
      '& > div:last-child': { opacity: 1 },
    }}>
      {data.map((line, i) => <div key={i}>{line}</div>)}
    </Box>
  );
}

// ─── PROGRESS BAR WITH LABEL ────────────────────────────────────────────────
function DiagBar({ label, value, color = 'var(--accent)', suffix = '%' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', textTransform: 'uppercase', minWidth: 40, letterSpacing: 0.5 }}>{label}</Typography>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          flex: 1, height: 4, borderRadius: 1,
          bgcolor: 'rgba(255,255,255,0.05)',
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            boxShadow: `0 0 6px ${color}66`,
            borderRadius: 1,
          },
        }}
      />
      <Typography sx={{ fontSize: 8, color: `${color}cc`, fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
        {value}{suffix}
      </Typography>
    </Box>
  );
}

// ─── FAKE TOGGLE SWITCH ROW ─────────────────────────────────────────────────
function ToggleRow({ label, defaultOn = false, color = 'var(--accent)' }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <StatusLED color={on ? color : '#333'} size={5} />
        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      </Box>
      <Switch
        size="small"
        checked={on}
        onChange={() => setOn(!on)}
        sx={{
          width: 28, height: 16, p: 0,
          '& .MuiSwitch-switchBase': { p: '2px',
            '&.Mui-checked': { transform: 'translateX(12px)', color: '#fff' },
            '&.Mui-checked + .MuiSwitch-track': { bgcolor: color, opacity: 0.8 },
          },
          '& .MuiSwitch-thumb': { width: 12, height: 12, boxShadow: `0 0 4px ${on ? color : '#333'}` },
          '& .MuiSwitch-track': { borderRadius: 8, bgcolor: '#222', opacity: 1 },
        }}
      />
    </Box>
  );
}

// ─── MINI SLIDER CONTROL ────────────────────────────────────────────────────
function SliderControl({ label, defaultValue = 50, color = 'var(--accent)', min = 0, max = 100, unit = '' }) {
  const [val, setVal] = useState(defaultValue);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.2 }}>
      <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', textTransform: 'uppercase', minWidth: 36, letterSpacing: 0.5 }}>{label}</Typography>
      <Slider
        size="small" min={min} max={max} value={val}
        onChange={(_, v) => setVal(v)}
        sx={{
          flex: 1, height: 3, color: color, p: '6px 0',
          '& .MuiSlider-thumb': { width: 10, height: 10, boxShadow: `0 0 5px ${color}66` },
          '& .MuiSlider-track': { boxShadow: `0 0 4px ${color}44` },
          '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.08)' },
        }}
      />
      <Typography sx={{ fontSize: 8, color: `${color}cc`, fontFamily: 'monospace', minWidth: 24, textAlign: 'right' }}>{val}{unit}</Typography>
    </Box>
  );
}

// ─── SECTION HEADER ─────────────────────────────────────────────────────────
function SectionHeader({ label, color = 'var(--accent)', icon }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8,
      borderBottom: `1px solid ${color}33`, pb: 0.4,
    }}>
      <Box sx={{ width: 3, height: 12, bgcolor: color, borderRadius: 1, boxShadow: `0 0 6px ${color}66` }} />
      {icon && <Typography sx={{ fontSize: 10 }}>{icon}</Typography>}
      <Typography sx={{
        fontSize: 9, fontWeight: 700, color: color,
        fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2,
      }}>{label}</Typography>
    </Box>
  );
}

// ─── SUBSYSTEM PANEL ────────────────────────────────────────────────────────
function SubsystemPanel({ title, color, icon, children }) {
  return (
    <Box sx={{
      background: 'var(--panel-bg)',
      border: `1px solid ${color}22`,
      borderRadius: 1.5, p: 1,
      boxShadow: `inset 0 1px 0 ${color}11, 0 2px 8px rgba(0,0,0,0.4)`,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: `linear-gradient(90deg, transparent, ${color}44, transparent)`,
      },
    }}>
      <SectionHeader label={title} color={color} icon={icon} />
      {children}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ███ MAIN COCKPIT PANEL ████████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════
export default function CockpitPanel() {
  // Live data — simulated real-time updates
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1500);
    return () => clearInterval(t);
  }, []);

  // Randomized live values
  const liveData = useMemo(() => ({
    cpu: 15 + Math.floor(Math.random() * 45),
    mem: 30 + Math.floor(Math.random() * 35),
    gpu: 5 + Math.floor(Math.random() * 50),
    net: Math.floor(Math.random() * 100),
    disk: 40 + Math.floor(Math.random() * 30),
    temp: 38 + Math.floor(Math.random() * 25),
    fps: 55 + Math.floor(Math.random() * 10),
    ping: 8 + Math.floor(Math.random() * 80),
    threads: 4 + Math.floor(Math.random() * 12),
    uptime: `${Math.floor(tick * 1.5 / 60)}h ${(tick * 1.5) % 60 | 0}m`,
    sigStrength: 60 + Math.floor(Math.random() * 40),
    power: 85 + Math.floor(Math.random() * 15),
    shieldIntegrity: 70 + Math.floor(Math.random() * 30),
    hullTemp: 180 + Math.floor(Math.random() * 120),
    fuelCell: 65 + Math.floor(Math.random() * 35),
    oxygenFlow: 90 + Math.floor(Math.random() * 10),
  }), [tick]);

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', gap: 1,
      '@keyframes ledBlink': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.2 },
      },
      '@keyframes scanAnim': {
        '0%': { transform: 'translateY(-100%)' },
        '100%': { transform: 'translateY(100%)' },
      },
    }}>

      {/* ═══ TOP STATUS BAR ═══ */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 1.5, px: 1.2, py: 0.6,
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, letterSpacing: 2 }}>
            ◈ VESPER OPS CONSOLE v2.7.4
          </Typography>
          <Chip label="ONLINE" size="small" sx={{
            height: 16, fontSize: 8, fontWeight: 700, fontFamily: 'monospace',
            bgcolor: 'rgba(0,255,100,0.12)', color: '#00ff64', border: '1px solid #00ff6444',
            letterSpacing: 1,
          }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <StatusLED color="#00ff64" label="SYS" size={6} />
          <StatusLED color="#00ffff" label="NET" size={6} />
          <StatusLED color="#ffaa00" label="GPU" blink={liveData.gpu > 40} size={6} />
          <StatusLED color={liveData.temp > 55 ? '#ff4444' : '#00ff64'} label="THR" blink={liveData.temp > 55} size={6} />
          <Typography sx={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
            UP {liveData.uptime}
          </Typography>
        </Box>
      </Box>

      {/* ═══ GAUGE STRIP ═══ */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 1.5, py: 0.8, px: 0.5,
      }}>
        <MiniGauge value={liveData.cpu} label="CPU" color="#00ffff" />
        <MiniGauge value={liveData.mem} label="MEM" color="#ff6ad5" />
        <MiniGauge value={liveData.gpu} label="GPU" color="#00ff88" />
        <MiniGauge value={liveData.temp} label="TEMP" color={liveData.temp > 55 ? '#ff4444' : '#ffaa00'} />
        <MiniGauge value={liveData.sigStrength} label="SIG" color="#5ad7ff" />
        <MiniGauge value={liveData.power} label="PWR" color="#c084fc" />
      </Box>

      {/* ═══ MAIN PANELS GRID ═══ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>

        {/* ── ENGINE / CORE SYSTEMS ── */}
        <SubsystemPanel title="Core Systems" color="#00ffff" icon="⚙️">
          <DiagBar label="CPU" value={liveData.cpu} color="#00ffff" />
          <DiagBar label="MEM" value={liveData.mem} color="#ff6ad5" />
          <DiagBar label="DISK" value={liveData.disk} color="#ffaa00" />
          <DiagBar label="GPU" value={liveData.gpu} color="#00ff88" />
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <StatusLED color="#00ff64" label="CORE-0" size={5} />
            <StatusLED color="#00ff64" label="CORE-1" size={5} />
            <StatusLED color="#00ff64" label="CORE-2" size={5} />
            <StatusLED color={tick % 3 === 0 ? '#ffaa00' : '#00ff64'} label="CORE-3" blink={tick % 3 === 0} size={5} />
          </Box>
        </SubsystemPanel>

        {/* ── NAVIGATION / NETWORK ── */}
        <SubsystemPanel title="Navigation" color="#5ad7ff" icon="🛰️">
          <DiagBar label="PING" value={Math.min(100, liveData.ping)} color="#5ad7ff" suffix="ms" />
          <DiagBar label="SIG" value={liveData.sigStrength} color="#00ff88" />
          <DiagBar label="BW" value={liveData.net} color="#c084fc" suffix="%" />
          <SliderControl label="GAIN" defaultValue={72} color="#5ad7ff" unit="dB" />
          <Box sx={{ mt: 0.3, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <StatusLED color="#5ad7ff" label="GPS" size={5} />
            <StatusLED color="#00ff64" label="DNS" size={5} />
            <StatusLED color="#ffaa00" label="SAT" blink size={5} />
          </Box>
        </SubsystemPanel>

        {/* ── COMMS / DATA ── */}
        <SubsystemPanel title="Comms Array" color="#c084fc" icon="📡">
          <ToggleRow label="TX Broadcast" defaultOn color="#c084fc" />
          <ToggleRow label="RX Monitor" defaultOn color="#c084fc" />
          <ToggleRow label="Encryption" defaultOn color="#00ff64" />
          <ToggleRow label="Stealth Mode" color="#ff4444" />
          <SliderControl label="FREQ" defaultValue={440} color="#c084fc" min={200} max={900} unit="Hz" />
          <SliderControl label="PWR" defaultValue={80} color="#ffaa00" unit="%" />
        </SubsystemPanel>

        {/* ── WEAPONS / DEFENSE ── */}
        <SubsystemPanel title="Defense Grid" color="#ff4444" icon="🛡️">
          <DiagBar label="SHLD" value={liveData.shieldIntegrity} color={liveData.shieldIntegrity > 80 ? '#00ff64' : '#ff4444'} />
          <DiagBar label="HULL" value={Math.min(100, Math.floor(liveData.hullTemp / 3))} color="#ffaa00" suffix="°C" />
          <DiagBar label="FUEL" value={liveData.fuelCell} color="#00ffff" />
          <DiagBar label="O₂" value={liveData.oxygenFlow} color="#5ad7ff" />
          <ToggleRow label="Auto-Turret" defaultOn color="#ff4444" />
          <ToggleRow label="Countermeas." color="#ffaa00" />
          <Box sx={{ mt: 0.3, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <StatusLED color="#00ff64" label="ARM" size={5} />
            <StatusLED color={liveData.shieldIntegrity < 80 ? '#ff4444' : '#00ff64'} label="SHLD" blink={liveData.shieldIntegrity < 80} size={5} />
            <StatusLED color="#ffaa00" label="LOCK" blink size={5} />
          </Box>
        </SubsystemPanel>
      </Box>

      {/* ═══ DATA STREAMS ═══ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <SubsystemPanel title="Telemetry Feed" color="#00ffff" icon="📊">
          <DataStream color="#00ffff" lines={6} speed={25} />
        </SubsystemPanel>
        <SubsystemPanel title="Comms Log" color="#c084fc" icon="📻">
          <DataStream color="#c084fc" lines={6} speed={35} />
        </SubsystemPanel>
      </Box>

      {/* ═══ BOTTOM CONTROL STRIP ═══ */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
      }}>
        {/* Environmental */}
        <SubsystemPanel title="Environment" color="#00ff88" icon="🌡️">
          <SliderControl label="TEMP" defaultValue={21} color="#00ff88" min={16} max={30} unit="°" />
          <SliderControl label="HUM" defaultValue={45} color="#5ad7ff" min={20} max={80} unit="%" />
          <SliderControl label="O₂" defaultValue={21} color="#00ffff" min={18} max={25} unit="%" />
          <ToggleRow label="Life Support" defaultOn color="#00ff64" />
          <ToggleRow label="Air Recyc." defaultOn color="#00ff88" />
        </SubsystemPanel>

        {/* Power Management */}
        <SubsystemPanel title="Power Grid" color="#ffaa00" icon="⚡">
          <DiagBar label="MAIN" value={liveData.power} color="#ffaa00" />
          <DiagBar label="AUX" value={Math.max(0, liveData.power - 20)} color="#c084fc" />
          <DiagBar label="BATT" value={Math.max(0, liveData.fuelCell - 10)} color="#00ff88" />
          <ToggleRow label="Aux Reactor" defaultOn color="#ffaa00" />
          <ToggleRow label="Emergency" color="#ff4444" />
          <Box sx={{ mt: 0.3, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <StatusLED color="#00ff64" label="PSU-1" size={5} />
            <StatusLED color="#00ff64" label="PSU-2" size={5} />
            <StatusLED color={tick % 5 === 0 ? '#ffaa00' : '#00ff64'} label="PSU-3" blink={tick % 5 === 0} size={5} />
          </Box>
        </SubsystemPanel>

        {/* Misc / Decorative */}
        <SubsystemPanel title="Diagnostics" color="#ff6ad5" icon="🔬">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
            {['A0', 'A1', 'B0', 'B1', 'C0', 'C1', 'D0', 'D1'].map((ch, i) => (
              <StatusLED key={ch} color={i < 6 ? '#00ff64' : (tick % 2 === 0 ? '#ffaa00' : '#ff4444')} label={ch} blink={i >= 6} size={5} />
            ))}
          </Box>
          <DiagBar label="FPS" value={liveData.fps} color="#ff6ad5" suffix="" />
          <DiagBar label="THR" value={Math.min(100, liveData.threads * 6)} color="#00ffff" suffix="" />
          <SliderControl label="BIAS" defaultValue={50} color="#ff6ad5" min={-100} max={100} />
          <ToggleRow label="Debug Mode" color="#ff6ad5" />
          <ToggleRow label="Verbose Log" color="#ffaa00" />
        </SubsystemPanel>
      </Box>

      {/* ═══ BOTTOM READOUT BAR ═══ */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 1, px: 1, py: 0.4,
      }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {[
            { l: 'FPS', v: liveData.fps, c: '#ff6ad5' },
            { l: 'PING', v: `${liveData.ping}ms`, c: '#5ad7ff' },
            { l: 'THREADS', v: liveData.threads, c: '#00ffff' },
            { l: 'TEMP', v: `${liveData.temp}°C`, c: liveData.temp > 55 ? '#ff4444' : '#ffaa00' },
          ].map(({ l, v, c }) => (
            <Typography key={l} sx={{ fontSize: 8, fontFamily: 'monospace', color: c, letterSpacing: 0.5 }}>
              {l}: <span style={{ fontWeight: 700 }}>{v}</span>
            </Typography>
          ))}
        </Box>
        <Typography sx={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
          SYS.OK │ ALL STATIONS NOMINAL │ {new Date().toLocaleTimeString('en-US', { hour12: false })}
        </Typography>
      </Box>
    </Box>
  );
}
