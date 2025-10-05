import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Database, Droplets } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const RLStorageOptimizer = () => {
  const [baseStorage, setBaseStorage] = useState(50);
  const [currentStorage, setCurrentStorage] = useState(50);
  const [usedStorage, setUsedStorage] = useState(0);
  const [storageUnits, setStorageUnits] = useState([{ id: 1, size: 50, used: 0 }]);
  const [requestValue, setRequestValue] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [episode, setEpisode] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [metrics, setMetrics] = useState([]);
  const [history, setHistory] = useState([]);
  
  // RL Parameters
  const [qTable, setQTable] = useState({});
  const [epsilon, setEpsilon] = useState(0.3);
  const learningRate = 0.1;
  const discountFactor = 0.95;
  const epsilonDecay = 0.995;
  
  // Dynamic storage optimization with 20% buffer
  const optimizeStorage = (usedAmount) => {
    const BUFFER_PERCENT = 0.2;
    const MAX_CONTAINER_SIZE = 100;
    
    // Calculate required storage with 20% buffer
    const requiredStorage = Math.ceil(usedAmount * (1 + BUFFER_PERCENT));
    
    if (requiredStorage === 0) {
      return {
        units: [{ id: 1, size: baseStorage, used: 0 }],
        total: baseStorage
      };
    }
    
    // Create containers of max 100GB each
    const newUnits = [];
    let remainingStorage = requiredStorage;
    let containerId = 1;
    
    while (remainingStorage > 0) {
      const containerSize = Math.min(MAX_CONTAINER_SIZE, remainingStorage);
      newUnits.push({
        id: containerId++,
        size: containerSize,
        used: 0
      });
      remainingStorage -= containerSize;
    }
    
    // Distribute used storage across containers
    let remainingUsed = usedAmount;
    for (let unit of newUnits) {
      const toUse = Math.min(remainingUsed, unit.size);
      unit.used = toUse;
      remainingUsed -= toUse;
    }
    
    return {
      units: newUnits,
      total: newUnits.reduce((sum, u) => sum + u.size, 0)
    };
  };
  
  // State representation
  const getState = (used, total) => {
    const utilization = Math.floor((used / total) * 100);
    const wasteRatio = Math.floor(((total - used) / total) * 100);
    return `u${utilization}_w${wasteRatio}`;
  };
  
  // Actions: 0=do nothing, 1=add storage, 2=remove storage
  const actions = [0, 1, 2];
  
  // Initialize Q-table entry
  const getQValue = (state, action) => {
    if (!qTable[state]) return 0;
    return qTable[state][action] || 0;
  };
  
  // Calculate reward
  const calculateReward = (used, total, prevTotal) => {
    const utilization = used / total;
    const waste = (total - used) / total;
    
    let reward = 0;
    if (utilization >= 0.6 && utilization <= 0.9) {
      reward += 10;
    } else if (utilization < 0.3) {
      reward -= 15;
    } else if (utilization > 0.95) {
      reward -= 10;
    }
    
    reward -= waste * 5;
    
    if (total > prevTotal) {
      reward -= 2;
    }
    
    if (total < prevTotal && utilization > 0.5) {
      reward += 5;
    }
    
    return reward;
  };
  
  // Select action using epsilon-greedy
  const selectAction = (state) => {
    if (Math.random() < epsilon) {
      return actions[Math.floor(Math.random() * actions.length)];
    }
    
    let bestAction = 0;
    let bestValue = getQValue(state, 0);
    
    for (let i = 1; i < actions.length; i++) {
      const value = getQValue(state, i);
      if (value > bestValue) {
        bestValue = value;
        bestAction = i;
      }
    }
    
    return bestAction;
  };
  
  // Update Q-table
  const updateQTable = (state, action, reward, nextState) => {
    const currentQ = getQValue(state, action);
    const maxNextQ = Math.max(...actions.map(a => getQValue(nextState, a)));
    const newQ = currentQ + learningRate * (reward + discountFactor * maxNextQ - currentQ);
    
    setQTable(prev => ({
      ...prev,
      [state]: {
        ...prev[state],
        [action]: newQ
      }
    }));
  };
  
  // Training simulation
  const trainStep = () => {
    const prevTotal = currentStorage;
    const state = getState(usedStorage, currentStorage);
    const action = selectAction(state);
    
    let newUsedStorage = usedStorage;
    
    if (Math.random() > 0.5) {
      const change = Math.floor(Math.random() * 20) - 5;
      newUsedStorage = Math.max(0, usedStorage + change);
    }
    
    const optimized = optimizeStorage(newUsedStorage);
    
    const nextState = getState(newUsedStorage, optimized.total);
    const reward = calculateReward(newUsedStorage, optimized.total, prevTotal);
    
    updateQTable(state, action, reward, nextState);
    
    setUsedStorage(newUsedStorage);
    setCurrentStorage(optimized.total);
    setStorageUnits(optimized.units);
    setTotalReward(prev => prev + reward);
    setEpsilon(prev => Math.max(0.01, prev * epsilonDecay));
    setEpisode(prev => prev + 1);
    
    setMetrics(prev => [...prev, {
      episode: episode,
      reward: reward,
      utilization: ((newUsedStorage / optimized.total) * 100).toFixed(1),
      storage: optimized.total,
      waste: optimized.total - newUsedStorage
    }].slice(-50));
  };
  
  // Auto-training
  useEffect(() => {
    let interval;
    if (isTraining) {
      interval = setInterval(() => {
        const prevTotal = currentStorage;
        const state = getState(usedStorage, currentStorage);
        const action = selectAction(state);
        
        let newUsedStorage = usedStorage;
        
        if (Math.random() > 0.5) {
          const change = Math.floor(Math.random() * 20) - 5;
          newUsedStorage = Math.max(0, usedStorage + change);
        }
        
        const optimized = optimizeStorage(newUsedStorage);
        
        const nextState = getState(newUsedStorage, optimized.total);
        const reward = calculateReward(newUsedStorage, optimized.total, prevTotal);
        
        updateQTable(state, action, reward, nextState);
        
        setUsedStorage(newUsedStorage);
        setCurrentStorage(optimized.total);
        setStorageUnits(optimized.units);
        setTotalReward(prev => prev + reward);
        setEpsilon(prev => Math.max(0.01, prev * epsilonDecay));
        setEpisode(prev => prev + 1);
        
        setMetrics(prev => [...prev, {
          episode: episode,
          reward: reward,
          utilization: ((newUsedStorage / optimized.total) * 100).toFixed(1),
          storage: optimized.total,
          waste: optimized.total - newUsedStorage
        }].slice(-50));
      }, 100);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTraining, episode]);
  
  const handleAddStorage = () => {
    const value = parseInt(requestValue);
    if (isNaN(value) || value <= 0) return;
    
    const newUsedStorage = usedStorage + value;
    const optimized = optimizeStorage(newUsedStorage);
    
    setUsedStorage(newUsedStorage);
    setCurrentStorage(optimized.total);
    setStorageUnits(optimized.units);
    setRequestValue('');
    
    addHistory(`Added ${value} GB storage, optimized to ${optimized.total} GB`, 'add');
  };
  
  const handleRemoveStorage = () => {
    const value = parseInt(requestValue);
    if (isNaN(value) || value <= 0 || value > usedStorage) return;
    
    const newUsedStorage = Math.max(0, usedStorage - value);
    const optimized = optimizeStorage(newUsedStorage);
    
    setUsedStorage(newUsedStorage);
    setCurrentStorage(optimized.total);
    setStorageUnits(optimized.units);
    setRequestValue('');
    
    addHistory(`Removed ${value} GB, optimized to ${optimized.total} GB`, 'remove');
  };
  
  const addHistory = (action, type) => {
    setHistory(prev => [{
      time: new Date().toLocaleTimeString(),
      action,
      type,
      utilization: ((usedStorage / currentStorage) * 100).toFixed(1)
    }, ...prev].slice(0, 10));
  };
  
  const reset = () => {
    setUsedStorage(0);
    const optimized = optimizeStorage(0);
    setCurrentStorage(optimized.total);
    setStorageUnits(optimized.units);
    setEpisode(0);
    setTotalReward(0);
    setMetrics([]);
    setHistory([]);
    setQTable({});
    setEpsilon(0.3);
    setIsTraining(false);
  };
  
  const utilization = (usedStorage / currentStorage * 100).toFixed(1);
  const waste = currentStorage - usedStorage;
  const efficiency = (100 - (waste / currentStorage * 100)).toFixed(1);
  
  // Water container component
  const WaterContainer = ({ used, total, label, size = 'normal' }) => {
    const fillPercentage = (used / total) * 100;
    const height = size === 'large' ? 320 : 200;
    const width = size === 'large' ? 180 : 120;
    
    return (
      <div className="flex flex-col items-center">
        <div 
          className="relative bg-gradient-to-b from-slate-700/30 to-slate-800/50 rounded-lg border-4 border-slate-600 overflow-hidden"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
            style={{ 
              height: `${fillPercentage}%`,
              background: fillPercentage > 90 ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)' :
                         fillPercentage > 60 ? 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)' :
                         'linear-gradient(180deg, #06b6d4 0%, #0891b2 100%)'
            }}
          >
            <div className="absolute inset-0 opacity-30">
              <div 
                className="absolute w-full h-8 bg-white rounded-full"
                style={{
                  top: '-16px',
                  animation: 'wave 3s ease-in-out infinite'
                }}
              />
            </div>
          </div>
          
          {[25, 50, 75].map(line => (
            <div 
              key={line}
              className="absolute left-0 right-0 border-t border-slate-500/30"
              style={{ bottom: `${line}%` }}
            />
          ))}
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg">
              <div className="text-3xl font-bold text-white">{fillPercentage.toFixed(1)}%</div>
              <div className="text-sm text-white/80">{used} / {total} GB</div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-center">
          <div className="text-white font-semibold">{label}</div>
        </div>
        
        <style>{`
          @keyframes wave {
            0%, 100% { transform: translateX(0) translateY(0); }
            25% { transform: translateX(-10px) translateY(-5px); }
            50% { transform: translateX(0) translateY(-8px); }
            75% { transform: translateX(10px) translateY(-5px); }
          }
        `}</style>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Database className="text-purple-400" />
            RL Storage Optimizer
          </h1>
          <p className="text-purple-200">AI-Powered Cloud Storage Management</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-purple-500/30 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
            <Droplets className="text-blue-400" />
            Total Storage Pool
          </h2>
          <div className="flex justify-center">
            <WaterContainer 
              used={usedStorage} 
              total={currentStorage} 
              label="Master Container"
              size="large"
            />
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6 text-center">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-purple-200 text-sm">Utilization</div>
              <div className="text-2xl font-bold text-white">{utilization}%</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-purple-200 text-sm">Efficiency</div>
              <div className="text-2xl font-bold text-green-400">{efficiency}%</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-purple-200 text-sm">Wasted</div>
              <div className="text-2xl font-bold text-red-400">{waste} GB</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-purple-200 text-sm">Units</div>
              <div className="text-2xl font-bold text-blue-400">{storageUnits.length}</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Configuration</h2>
            
            <div className="mb-4">
              <label className="text-purple-200 text-sm block mb-2">Base Storage Unit (GB) - Max 100 GB per container</label>
              <input
                type="number"
                value={baseStorage}
                onChange={(e) => {
                  const newBase = Math.max(10, Math.min(100, parseInt(e.target.value) || 50));
                  setBaseStorage(newBase);
                  if (usedStorage === 0) {
                    setCurrentStorage(newBase);
                    setStorageUnits([{ id: 1, size: newBase, used: 0 }]);
                  }
                }}
                min="10"
                max="100"
                className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-purple-500/30"
              />
              <p className="text-xs text-purple-300 mt-1">Containers auto-resize with 20% buffer</p>
            </div>
            
            <div className="mb-4">
              <label className="text-purple-200 text-sm block mb-2">Storage Request (GB)</label>
              <input
                type="number"
                value={requestValue}
                onChange={(e) => setRequestValue(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-purple-500/30"
              />
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleAddStorage}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={16} /> Add
              </button>
              <button
                onClick={handleRemoveStorage}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Minus size={16} /> Remove
              </button>
            </div>
            
            <div className="border-t border-purple-500/30 pt-4 mt-4">
              <h3 className="text-white font-semibold mb-3">RL Training</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsTraining(!isTraining)}
                  className={`flex-1 ${isTraining ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors`}
                >
                  {isTraining ? <Pause size={16} /> : <Play size={16} />}
                  {isTraining ? 'Pause' : 'Start'}
                </button>
                <button
                  onClick={reset}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
              
              <div className="mt-4 space-y-2 text-sm">
                <div className="text-purple-200">Episode: <span className="text-white font-bold">{episode}</span></div>
                <div className="text-purple-200">Total Reward: <span className="text-white font-bold">{totalReward.toFixed(1)}</span></div>
                <div className="text-purple-200">Epsilon: <span className="text-white font-bold">{epsilon.toFixed(3)}</span></div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Droplets className="text-cyan-400" />
              Individual Storage Units
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2">
              {storageUnits.map((unit) => (
                <WaterContainer 
                  key={unit.id}
                  used={unit.used} 
                  total={unit.size} 
                  label={`Unit ${unit.id}`}
                  size="normal"
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Training Progress</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                <XAxis dataKey="episode" stroke="#c4b5fd" />
                <YAxis stroke="#c4b5fd" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed' }} />
                <Legend />
                <Line type="monotone" dataKey="reward" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Storage Utilization Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                <XAxis dataKey="episode" stroke="#c4b5fd" />
                <YAxis stroke="#c4b5fd" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed' }} />
                <Legend />
                <Bar dataKey="utilization" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Storage Capacity Changes</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                <XAxis dataKey="episode" stroke="#c4b5fd" />
                <YAxis stroke="#c4b5fd" label={{ value: 'GB', angle: -90, position: 'insideLeft', fill: '#c4b5fd' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #7c3aed' }} />
                <Legend />
                <Line type="monotone" dataKey="storage" stroke="#10b981" strokeWidth={2} name="Total Storage (GB)" />
                <Line type="monotone" dataKey="waste" stroke="#ef4444" strokeWidth={2} name="Wasted Space (GB)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
          <h2 className="text-xl font-bold text-white mb-4">Action History</h2>
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {entry.type === 'add' ? (
                    <Plus className="text-green-400" size={16} />
                  ) : (
                    <Minus className="text-red-400" size={16} />
                  )}
                  <span className="text-white">{entry.action}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-purple-200 text-sm">{entry.time}</span>
                  <span className="text-blue-400 text-sm">{entry.utilization}% used</span>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center text-purple-300 py-8">No actions yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RLStorageOptimizer;