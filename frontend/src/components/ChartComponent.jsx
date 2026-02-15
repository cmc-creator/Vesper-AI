import React from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

const ChartComponent = ({ type, title, data, xKey, yKey }) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey={yKey} fill="#8884d8" />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Area type="monotone" dataKey={yKey} stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        );
      case 'pie':
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
        return (
          <PieChart>
             <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey} // Recharts usually uses 'value' but we map it
              nameKey={xKey} // Usually 'name'
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
               contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }}
               itemStyle={{ color: '#fff' }}
            />
            <Legend />
          </PieChart>
        );
      case 'line':
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        );
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        my: 2, 
        background: 'rgba(0, 20, 40, 0.6)', 
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" sx={{ color: '#00ffff', mb: 2, textAlign: 'center' }}>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ChartComponent;
