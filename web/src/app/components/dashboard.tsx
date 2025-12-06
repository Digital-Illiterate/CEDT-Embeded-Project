// src/app/components/Dashboard.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, DataSnapshot } from "firebase/database";
import RealTimeChart from './realtimechart'; 

// --- 1. INTERFACES (UNCHANGED) ---

interface DashboardData {
  local: {
    temp: number;
    light: number;
  };
  remote: {
    temp: number;
    humid: number; 
    sound: number;
    dust: number;
    gas: number;
  };
}

interface HistoryItem {
  time: number;
  localTemp: number;
  localLight: number;
  remoteTemp: number;
  humidity: number;
  sound: number;
  dust: number;
  gas: number;
}

interface CombinedState {
    data: DashboardData | null;
    isLocalLoaded: boolean;
    isRemoteLoaded: boolean;
    isLoading: boolean;
    history: HistoryItem[];
}

interface ChartConfig {
    localTemp: boolean;
    localLight: boolean;
    remoteTemp: boolean;
    humidity: boolean;
    sound: boolean;
    dust: boolean;
    gas: boolean;
}


// --- 2. CONSTANTS (UNCHANGED) ---

const MAX_HISTORY_POINTS = 20;
const HISTORY_UPDATE_DELAY_MS = 500; 

// --- 3. COMPONENT START (Logic Unchanged) ---

const DashboardComponent: React.FC = () => {
    
  const [state, setState] = useState<CombinedState>({
    data: null,
    isLocalLoaded: false,
    isRemoteLoaded: false,
    isLoading: true,
    history: [],
  });
    
    // State for Chart Configuration (which lines to show)
    const [chartConfig, setChartConfig] = useState<ChartConfig>({
        localTemp: true,
        localLight: false,
        remoteTemp: true,
        humidity: true,
        sound: false,
        dust: false,
        gas: false,
    });

    // Refs and Handlers (Throttling, Chart Config) remain the same
    const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingDataRef = useRef<DashboardData | null>(null);

    const handleChartConfigChange = (metric: keyof ChartConfig) => {
        setChartConfig(prevConfig => ({
            ...prevConfig,
            [metric]: !prevConfig[metric]
        }));
    };

    const commitHistoryUpdate = () => {
        const currentData = pendingDataRef.current;
        if (!currentData) return;

        const newTimestamp = Date.now(); 
        
        const newHistoryItem: HistoryItem = {
            time: newTimestamp,
            localTemp: Math.round(currentData.local.temp * 100) / 100,
            localLight: Math.round(currentData.local.light * 100) / 100,
            remoteTemp: Math.round(currentData.remote.temp * 100) / 100,
            humidity: Math.round(currentData.remote.humid * 100) / 100, 
            sound: currentData.remote.sound,
            dust: currentData.remote.dust,
            gas: currentData.remote.gas,
        };

        setState(prevState => {
            let updatedHistory = [...prevState.history, newHistoryItem];
            if (updatedHistory.length > MAX_HISTORY_POINTS) {
                updatedHistory = updatedHistory.slice(updatedHistory.length - MAX_HISTORY_POINTS);
            }
            return { ...prevState, history: updatedHistory };
        });
        
        throttleTimerRef.current = null;
    };
    
    const throttleHistoryUpdate = (latestData: DashboardData) => {
        pendingDataRef.current = latestData;

        if (throttleTimerRef.current === null) {
            throttleTimerRef.current = setTimeout(commitHistoryUpdate, HISTORY_UPDATE_DELAY_MS);
        }
    };

  useEffect(() => {
    const localRef = ref(db, 'local');
    const remoteRef = ref(db, 'remote');

    const cleanupTimer = () => {
        if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
        }
    };

    // 1. Local Data Listener
    const unsubscribeLocal = onValue(localRef, (snapshot: DataSnapshot) => {
      const localData = snapshot.val();
      
      setState(prevState => {
        const mergedData: DashboardData = { 
            local: localData, 
            remote: prevState.data?.remote 
        } as DashboardData;

        const isReady = prevState.isRemoteLoaded && !!localData && !!mergedData.remote; 

        if (isReady) {
            throttleHistoryUpdate(mergedData); 
        }

        return {
          ...prevState,
          data: mergedData,
          isLocalLoaded: !!localData,
          isLoading: !isReady, 
        };
      });
    }, (error) => {
      console.error("Firebase RTDB Local Error:", error);
      setState(p => ({ ...p, isLoading: false }));
    });

    // 2. Remote Data Listener
    const unsubscribeRemote = onValue(remoteRef, (snapshot: DataSnapshot) => {
      const remoteData = snapshot.val();
      
      setState(prevState => {
        const mergedData: DashboardData = { 
            local: prevState.data?.local, 
            remote: remoteData 
        } as DashboardData;

        const isReady = prevState.isLocalLoaded && !!remoteData && !!mergedData.local;

        if (isReady) {
            throttleHistoryUpdate(mergedData);
        }

        return {
          ...prevState,
          data: mergedData,
          isRemoteLoaded: !!remoteData,
          isLoading: !isReady, 
        };
      });
    }, (error) => {
      console.error("Firebase RTDB Remote Error:", error);
      setState(p => ({ ...p, isLoading: false }));
    });
    
    return () => {
      unsubscribeLocal();
      unsubscribeRemote();
        cleanupTimer();
    };
  }, []); 

  // --- 4. RENDERING LOGIC ---
  
  if (state.isLoading) {
    return (
      <div className="text-center p-8 text-xl text-gray-500">
        Loading real-time dashboard data...
      </div>
    );
  }

  if (!state.data || !state.data.local || !state.data.remote) {
    return (
      <div className="text-center p-8 text-xl text-red-500">
        Waiting for initial data from both 'local' and 'remote' sensors.
      </div>
    );
  }

  const { data } = state;


  return (
    <div className="flex bg-gray-50 min-h-screen">
      
      {/* SIDEBAR: This section now only contains Metric Cards */}
      <div className="w-64 p-4 bg-white shadow-xl flex-shrink-0 overflow-y-auto">
        
        <h2 className="text-3xl font-bold mb-6 text-gray-800 pb-2">
          Current Status
        </h2>
        
        <div className="space-y-4">
          
          {/* --- LOCAL METRICS --- */}
          <h3 className="text-sm font-semibold text-gray-600 mt-4 pt-2 border-t">GATEWAY SENSORS</h3>

          {/* Metric Card 1: Local Temp */}
          <div className="p-4 rounded-lg shadow-sm border border-indigo-200">
            <p className="text-sm text-gray-500">Local Temp</p>
            <p className="text-2xl font-extrabold text-indigo-700">
              {data.local.temp.toFixed(2)} °C
            </p>
          </div>

          {/* Metric Card 2: Local Light */}
          <div className="p-4 rounded-lg shadow-sm border border-yellow-200">
            <p className="text-sm text-gray-500">Local Light</p>
            <p className="text-2xl font-extrabold text-yellow-700">
              {data.local.light.toFixed(2)} %
            </p>
          </div>
          
          {/* --- REMOTE METRICS --- */}
          <h3 className="text-sm font-semibold text-gray-600 mt-4 pt-2 border-t">NODE SENSORS</h3>

          {/* Metric Card 3: Remote Temp */}
          <div className="p-4 rounded-lg shadow-sm border border-red-200">
            <p className="text-sm text-gray-500">Remote Temp</p>
            <p className="text-2xl font-extrabold text-red-700">
              {data.remote.temp.toFixed(2)} °C
            </p>
          </div>

          {/* Metric Card 4: Humidity */}
          <div className="p-4 rounded-lg shadow-sm border border-blue-200">
            <p className="text-sm text-gray-500">Humidity</p>
            <p className="text-2xl font-extrabold text-blue-700">
              {data.remote.humid.toFixed(2)} %
            </p>
          </div>
          
          {/* Metric Card 5: Sound */}
          <div className="p-4 rounded-lg shadow-sm border border-green-200">
            <p className="text-sm text-gray-500">Sound Level</p>
            <p className="text-2xl font-extrabold text-green-700">
              {data.remote.sound} units
            </p>
          </div>

          {/* Metric Card 6: Dust */}
          <div className="p-4 rounded-lg shadow-sm border border-gray-400">
            <p className="text-sm text-gray-500">Dust Level</p>
            <p className="text-2xl font-extrabold text-gray-700">
              {/* {data.remote.dust} μg/m³ */}
              {data.remote.dust} units
            </p>
          </div>

          {/* Metric Card 7: Gas */}
          <div className="p-4 rounded-lg shadow-sm border border-purple-200">
            <p className="text-sm text-gray-500">Gas Reading</p>
            <p className="text-2xl font-extrabold text-purple-700">
              {/* {data.remote.gas} ppm */}
              {data.remote.gas} units
            </p>
          </div>
          
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-grow p-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">
          Real-Time Sensor Dashboard
        </h1>
        
        {/* Real-Time Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg h-[65vh] mb-6"> {/* Reduced height and added mb-6 for spacing */}
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Recent Data History</h2>
          <RealTimeChart data={state.history} config={chartConfig} /> 
        </div>

        {/* --- CHART CONTROLS (MOVED HERE) --- */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
                Select Chart Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                {Object.keys(chartConfig).map((key) => {
                    const metricKey = key as keyof ChartConfig;
                    return (
                        <div key={key} className="flex items-center">
                            <input
                                id={`chart-${key}`}
                                type="checkbox"
                                checked={chartConfig[metricKey]}
                                onChange={() => handleChartConfigChange(metricKey)}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor={`chart-${key}`} className="ml-3 font-medium text-gray-700 capitalize whitespace-nowrap">
                                {/* Convert camelCase to space-separated words for display */}
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardComponent;