'use client'

import React from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartVisualizationProps {
  data: Array<{ name: string; value: number }> | Array<{ name: string; [key: string]: any }>
  chartType: 'bar' | 'line' | 'pie'
  title?: string
  multiDatasets?: string[]
}

const COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#6ee7b7', '#34d399', '#14b8a6']

export default function ChartVisualization({ data, chartType, title, multiDatasets }: ChartVisualizationProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data to visualize
      </div>
    )
  }

  const isMultiDataset = multiDatasets && multiDatasets.length > 0

  return (
    <div className="w-full h-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        {chartType === 'bar' && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }} 
            />
            <Legend />
            {isMultiDataset ? (
              multiDatasets.map((dataset, idx) => (
                <Bar key={dataset} dataKey={dataset} fill={COLORS[idx % COLORS.length]} radius={[8, 8, 0, 0]} />
              ))
            ) : (
              <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
            )}
          </BarChart>
        )}
        
        {chartType === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }} 
            />
            <Legend />
            {isMultiDataset ? (
              multiDatasets.map((dataset, idx) => (
                <Line key={dataset} type="monotone" dataKey={dataset} stroke={COLORS[idx % COLORS.length]} strokeWidth={3} dot={{ fill: COLORS[idx % COLORS.length], r: 5 }} />
              ))
            ) : (
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
            )}
          </LineChart>
        )}
        
        {chartType === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }} 
            />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
