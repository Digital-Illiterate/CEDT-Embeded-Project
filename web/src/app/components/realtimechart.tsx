// src/app/components/RealTimeChart.tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// HistoryItem Interface (same)
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

// Interface for configuration (same)
interface ChartConfig {
    localTemp: boolean;
    localLight: boolean;
    remoteTemp: boolean;
    humidity: boolean;
    sound: boolean;
    dust: boolean;
    gas: boolean;
}

interface RealTimeChartProps {
  data: HistoryItem[];
  config: ChartConfig; 
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({ data, config }) => {
  
  const formatTime = (tickItem: number) => {
    return new Date(tickItem).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timeLabel = formatTime(label);
      
      return (
        <div className="bg-white p-3 border border-gray-300 shadow-lg text-sm rounded-md">
          <p className="font-bold text-gray-700 mb-1">{timeLabel}</p>
          {payload.map((item: any) => (
            <p key={item.name} style={{ color: item.color }}>
              {`${item.name}: ${item.value.toFixed(2)} ${item.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          // Adjust margin back since we only need space for one axis on the left
          margin={{ top: 5, right: 20, left: 0, bottom: 5, }} 
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          
          <XAxis
            dataKey="time"
            type="number"
            domain={['auto', 'auto']}
            scale="time"
            tickFormatter={formatTime}
          />

          {/* YAxis 1 (Left) - Now the ONLY axis */}
          <YAxis 
            yAxisId={0} 
            orientation="left"
            stroke="#6b7280" 
            label={{ value: 'Sensor Readings', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
          />
          
          {/* REMOVED: <YAxis yAxisId={1} ... /> */}

          <Tooltip content={<CustomTooltip />} labelFormatter={formatTime} /> 
          <Legend />

          {/* 1. Local Temperature Line (yAxisId=0) */}
          {config.localTemp && (
          <Line
            type="monotone"
            dataKey="localTemp"
            stroke="#4f46e5" // Indigo
            dot={false}
            name="Gateway Temp"
            unit="°C"
            yAxisId={0}
          />
          )}

          {/* 2. Remote Temperature Line (yAxisId=0) */}
          {config.remoteTemp && (
          <Line
            type="monotone"
            dataKey="remoteTemp"
            stroke="#b91c1c" // Red
            dot={false}
            name="Sensor-node Temp"
            unit="°C"
            yAxisId={0}
          />
          )}

          {/* 3. Humidity Line (yAxisId=0) */}
          {config.humidity && (
          <Line
            type="monotone"
            dataKey="humidity"
            stroke="#1d4ed8" // Blue
            dot={false}
            name="Humidity"
            unit="%"
            yAxisId={0}
          />
          )}
          
          {/* 4. Local Light Line (yAxisId=0) - NOW USES PRIMARY AXIS */}
          {config.localLight && (
          <Line
            type="monotone"
            dataKey="localLight"
            stroke="#f59e0b" // Amber/Yellow
            dot={false}
            name="Gateway Light"
            unit="%"
            yAxisId={0} // 🎯 CHANGED to yAxisId={0}
          />
          )}
          
          {/* 5. Sound Line (yAxisId=0) */}
          {config.sound && (
          <Line
            type="monotone"
            dataKey="sound"
            stroke="#059669" // Emerald Green
            dot={false}
            name="Sound Level"
            unit="units"
            yAxisId={0}
          />
          )}

          {/* 6. Dust Line (yAxisId=0) */}
          {config.dust && (
          <Line
            type="monotone"
            dataKey="dust"
            stroke="#4b5563" // Dark Gray
            dot={false}
            name="Dust Level"
            unit="μg/m³"
            yAxisId={0}
          />
          )}

          {/* 7. Gas Line (yAxisId=0) */}
          {config.gas && (
          <Line
            type="monotone"
            dataKey="gas"
            stroke="#9333ea" // Violet
            dot={false}
            name="Gas Reading"
            unit="ppm"
            yAxisId={0}
          />
          )}
          
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RealTimeChart;